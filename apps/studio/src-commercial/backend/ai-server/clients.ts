import crypto from "crypto";
import { IncomingHttpHeaders } from "http";
import { UserSetting, UserSettingValueType } from "@/common/appdb/models/user_setting";
import { AiServerClient, AiServerClientStatus, AiServerAccessRequest } from "./types";
import rawLog from "@bksLogger";

// Client identity + approve/deny gate.
//
// The AI server authenticates with a single shared bearer token — it has no
// per-client credentials. This module adds a second, identity-based layer:
// each caller is recognised (by an explicit client-id header, or failing that
// a hash of its user-agent) and must be approved by the user before its
// requests are served. Approvals/denials persist across restarts; the actual
// permissions a client gets are the same server-wide settings for everyone.

const log = rawLog.scope("ai-server:clients");
const KEY = "aiServerClients";

// How long an unknown client's request blocks waiting for the user's decision
// before it's told to retry. Kept under the HTTP server's requestTimeout.
const DECISION_WAIT_MS = 45_000;

type Identity = { id: string; name: string; userAgent: string };

interface PersistedClient {
  id: string;
  name: string;
  userAgent: string;
  status: "approved" | "denied";
  firstSeen: number;
}

let registry = new Map<string, AiServerClient>();
let loaded = false;

interface Pending {
  request: AiServerAccessRequest;
  waiters: Array<(decision: AiServerClientStatus) => void>;
}
const pending = new Map<string, Pending>();

type AccessRequestListener = (req: AiServerAccessRequest) => void;
type ClientsChangedListener = () => void;
const accessRequestListeners = new Set<AccessRequestListener>();
const clientsChangedListeners = new Set<ClientsChangedListener>();

export function onAccessRequest(fn: AccessRequestListener): () => void {
  accessRequestListeners.add(fn);
  return () => accessRequestListeners.delete(fn);
}

export function onClientsChanged(fn: ClientsChangedListener): () => void {
  clientsChangedListeners.add(fn);
  return () => clientsChangedListeners.delete(fn);
}

function emitAccessRequest(req: AiServerAccessRequest): void {
  for (const fn of accessRequestListeners) {
    try { fn(req); } catch (e) { log.warn("access-request listener", e); }
  }
}

function emitClientsChanged(): void {
  for (const fn of clientsChangedListeners) {
    try { fn(); } catch (e) { log.warn("clients-changed listener", e); }
  }
}

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const v = headers[name];
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Derive a stable identity for the caller. A client that sends an explicit
 * `X-Bks-Client-Id` gets a precise identity; everyone else is keyed by a hash
 * of their user-agent (good enough to tell distinct tools apart).
 */
export function identify(headers: IncomingHttpHeaders): Identity {
  const userAgent = headerValue(headers, "user-agent") || "Unknown client";
  const explicitId = headerValue(headers, "x-bks-client-id");
  const explicitName = headerValue(headers, "x-bks-client-name");
  const id = explicitId ? `id:${explicitId}` : `ua:${sha1(userAgent).slice(0, 16)}`;
  return { id, name: explicitName || userAgent, userAgent };
}

async function writeClients(): Promise<void> {
  const clients: PersistedClient[] = [];
  for (const c of registry.values()) {
    if (c.status === "approved" || c.status === "denied") {
      clients.push({
        id: c.id,
        name: c.name,
        userAgent: c.userAgent,
        status: c.status,
        firstSeen: c.firstSeen,
      });
    }
  }
  try {
    let setting = await UserSetting.get(KEY);
    if (!setting) {
      setting = new UserSetting();
      setting.key = KEY;
      setting.valueType = UserSettingValueType.object;
      setting.defaultValue = JSON.stringify({ clients: [] });
    } else if (setting.valueType !== UserSettingValueType.object) {
      setting.valueType = UserSettingValueType.object;
    }
    setting.value = { clients } as unknown as Record<string, unknown>;
    await setting.save();
  } catch (e) {
    log.warn("could not persist clients", e);
  }
}

// Serialise writes — two concurrent persists (e.g. several new clients
// auto-approving at once) must not read-modify-write over each other.
let persistChain: Promise<void> = Promise.resolve();

function persist(): Promise<void> {
  persistChain = persistChain.then(writeClients, writeClients);
  return persistChain;
}

export async function loadClients(): Promise<void> {
  try {
    const setting = await UserSetting.get(KEY);
    const raw = (setting?.value as { clients?: PersistedClient[] } | undefined)?.clients ?? [];
    registry = new Map();
    for (const c of raw) {
      if (!c || typeof c.id !== "string") continue;
      const seen = typeof c.firstSeen === "number" ? c.firstSeen : Date.now();
      registry.set(c.id, {
        id: c.id,
        name: typeof c.name === "string" ? c.name : c.id,
        userAgent: typeof c.userAgent === "string" ? c.userAgent : "",
        status: c.status === "denied" ? "denied" : "approved",
        firstSeen: seen,
        lastSeen: seen,
        requestCount: 0,
      });
    }
  } catch (e) {
    log.warn("could not load clients", e);
    registry = new Map();
  }
  loaded = true;
}

async function ensureLoaded(): Promise<void> {
  if (!loaded) await loadClients();
}

export async function listClients(): Promise<AiServerClient[]> {
  await ensureLoaded();
  const out = [...registry.values()].map((c) => ({ ...c }));
  // Surface in-flight requests that haven't been decided yet.
  for (const p of pending.values()) {
    if (!registry.has(p.request.id)) {
      out.push({
        id: p.request.id,
        name: p.request.name,
        userAgent: p.request.userAgent,
        status: "pending",
        firstSeen: p.request.requestedAt,
        lastSeen: p.request.requestedAt,
        requestCount: 0,
      });
    }
  }
  return out;
}

function register(identity: Identity, status: "approved" | "denied"): void {
  const now = Date.now();
  const existing = registry.get(identity.id);
  registry.set(identity.id, {
    id: identity.id,
    name: identity.name || existing?.name || identity.id,
    userAgent: identity.userAgent || existing?.userAgent || "",
    status,
    firstSeen: existing?.firstSeen ?? now,
    lastSeen: now,
    requestCount: existing?.requestCount ?? 0,
  });
}

function settlePending(id: string, decision: "approved" | "denied"): void {
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  for (const w of p.waiters) {
    try { w(decision); } catch (e) { log.warn("waiter", e); }
  }
}

function waitForDecision(identity: Identity, address: string): Promise<AiServerClientStatus> {
  return new Promise((resolve) => {
    let p = pending.get(identity.id);
    if (!p) {
      const request: AiServerAccessRequest = {
        id: identity.id,
        name: identity.name,
        userAgent: identity.userAgent,
        address,
        requestedAt: Date.now(),
      };
      p = { request, waiters: [] };
      pending.set(identity.id, p);
      emitAccessRequest(request);
      emitClientsChanged();
    }
    const waiter = (decision: AiServerClientStatus) => resolve(decision);
    p.waiters.push(waiter);
    setTimeout(() => {
      const cur = pending.get(identity.id);
      if (!cur) return;
      const idx = cur.waiters.indexOf(waiter);
      if (idx >= 0) {
        cur.waiters.splice(idx, 1);
        // Decision still outstanding — tell the client to retry. The pending
        // entry stays so the user can still act on the prompt.
        resolve("pending");
      }
    }, DECISION_WAIT_MS);
  });
}

/**
 * Decide whether a request may proceed. Approved/denied clients return at once;
 * an unknown client auto-approves when prompting is off, otherwise blocks until
 * the user decides (or the wait times out, yielding "pending").
 */
export async function gate(
  identity: Identity,
  address: string,
  promptEnabled: boolean
): Promise<AiServerClientStatus> {
  await ensureLoaded();
  const existing = registry.get(identity.id);
  if (existing) {
    existing.lastSeen = Date.now();
    if (existing.status === "approved") {
      existing.requestCount++;
      return "approved";
    }
    if (existing.status === "denied") return "denied";
  }

  if (!promptEnabled) {
    register(identity, "approved");
    await persist();
    emitClientsChanged();
    return "approved";
  }

  return waitForDecision(identity, address);
}

export async function approveClient(id: string): Promise<AiServerClient[]> {
  await ensureLoaded();
  const p = pending.get(id);
  const existing = registry.get(id);
  register(
    {
      id,
      name: p?.request.name ?? existing?.name ?? id,
      userAgent: p?.request.userAgent ?? existing?.userAgent ?? "",
    },
    "approved"
  );
  settlePending(id, "approved");
  await persist();
  emitClientsChanged();
  return listClients();
}

export async function denyClient(id: string): Promise<AiServerClient[]> {
  await ensureLoaded();
  const p = pending.get(id);
  const existing = registry.get(id);
  register(
    {
      id,
      name: p?.request.name ?? existing?.name ?? id,
      userAgent: p?.request.userAgent ?? existing?.userAgent ?? "",
    },
    "denied"
  );
  settlePending(id, "denied");
  await persist();
  emitClientsChanged();
  return listClients();
}

/** Forget a client entirely — it becomes unknown and will prompt again. */
export async function revokeClient(id: string): Promise<AiServerClient[]> {
  await ensureLoaded();
  registry.delete(id);
  settlePending(id, "denied");
  await persist();
  emitClientsChanged();
  return listClients();
}

/** Drop every in-flight wait — called when the server stops. */
export function resetPending(): void {
  for (const id of [...pending.keys()]) {
    settlePending(id, "denied");
  }
}
