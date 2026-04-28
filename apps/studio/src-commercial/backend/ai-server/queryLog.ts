import fs from "fs";
import path from "path";
import platformInfo from "@/common/platform_info";
import { uuidv4 } from "@/lib/uuid";
import rawLog from "@bksLogger";
import { AiServerLogEntry } from "./types";

const log = rawLog.scope("ai-server:queryLog");

const ROTATE_BYTES = 5 * 1024 * 1024;
const KEEP_FILES = 3;

let buffer: AiServerLogEntry[] = [];
let bufferSize = 500;
let persist = true;
let listeners = new Set<(entry: AiServerLogEntry) => void>();

function logFile(): string {
  return path.join(platformInfo.userDirectory, "ai-server.log.jsonl");
}

function rotateIfNeeded(): void {
  const f = logFile();
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(f);
  } catch {
    return;
  }
  if (stat.size < ROTATE_BYTES) return;
  for (let i = KEEP_FILES - 1; i >= 1; i--) {
    const src = `${f}.${i}`;
    const dst = `${f}.${i + 1}`;
    if (fs.existsSync(src)) {
      try { fs.renameSync(src, dst); } catch (e) { log.warn("rotate rename", e); }
    }
  }
  try { fs.renameSync(f, `${f}.1`); } catch (e) { log.warn("rotate primary", e); }
}

function persistEntry(entry: AiServerLogEntry): void {
  if (!persist) return;
  try {
    rotateIfNeeded();
    fs.appendFileSync(logFile(), JSON.stringify(entry) + "\n", { mode: 0o600 });
  } catch (e) {
    log.warn("could not append to ai-server.log.jsonl", e);
  }
}

export function configure(opts: { ringBufferSize: number; persist: boolean }): void {
  bufferSize = Math.max(10, opts.ringBufferSize);
  persist = opts.persist;
  if (buffer.length > bufferSize) {
    buffer = buffer.slice(-bufferSize);
  }
}

export function append(partial: Omit<AiServerLogEntry, "id" | "ts">): AiServerLogEntry {
  const entry: AiServerLogEntry = { id: uuidv4(), ts: Date.now(), ...partial };
  buffer.push(entry);
  if (buffer.length > bufferSize) buffer.shift();
  persistEntry(entry);
  for (const fn of listeners) {
    try { fn(entry); } catch (e) { log.warn("listener error", e); }
  }
  return entry;
}

export function recent(opts: { limit?: number; since?: number } = {}): AiServerLogEntry[] {
  const { limit, since } = opts;
  let out = buffer;
  if (typeof since === "number") out = out.filter((e) => e.ts > since);
  if (typeof limit === "number" && limit > 0) out = out.slice(-limit);
  return out;
}

export function clear(): void {
  buffer = [];
}

export function subscribe(fn: (entry: AiServerLogEntry) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function shutdown(): void {
  listeners.clear();
}
