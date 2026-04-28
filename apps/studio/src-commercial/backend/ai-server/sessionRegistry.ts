import { state, removeState } from "@/handlers/handlerState";
import rawLog from "@bksLogger";

const log = rawLog.scope("ai-server:sessions");

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface Entry {
  sId: string;
  lastUsedAt: number;
}

const sessions = new Map<string, Entry>();
let sweepTimer: NodeJS.Timeout | null = null;

function key(tokenPrefix: string, connectionId: number): string {
  return `${tokenPrefix}:${connectionId}`;
}

export function makeSId(tokenPrefix: string, connectionId: number): string {
  return `ai:${tokenPrefix}:${connectionId}`;
}

export function rememberSession(tokenPrefix: string, connectionId: number, sId: string): void {
  sessions.set(key(tokenPrefix, connectionId), { sId, lastUsedAt: Date.now() });
  ensureSweeper();
}

export function getSession(tokenPrefix: string, connectionId: number): string | null {
  const entry = sessions.get(key(tokenPrefix, connectionId));
  if (!entry) return null;
  entry.lastUsedAt = Date.now();
  return entry.sId;
}

export function forgetSession(tokenPrefix: string, connectionId: number): void {
  const k = key(tokenPrefix, connectionId);
  const entry = sessions.get(k);
  if (entry) {
    safeRemoveState(entry.sId);
    sessions.delete(k);
  }
}

export function forgetAll(): void {
  for (const entry of sessions.values()) {
    safeRemoveState(entry.sId);
  }
  sessions.clear();
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

function safeRemoveState(sId: string): void {
  try {
    const s = state(sId);
    if (s?.connection) {
      try {
        s.server?.disconnect();
      } catch (e) {
        log.warn("disconnect failed for", sId, e);
      }
    }
  } finally {
    removeState(sId);
  }
}

function ensureSweeper(): void {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const cutoff = Date.now() - IDLE_TIMEOUT_MS;
    for (const [k, entry] of sessions.entries()) {
      if (entry.lastUsedAt < cutoff) {
        safeRemoveState(entry.sId);
        sessions.delete(k);
      }
    }
    if (sessions.size === 0 && sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  }, 60_000).unref?.() as unknown as NodeJS.Timeout;
}
