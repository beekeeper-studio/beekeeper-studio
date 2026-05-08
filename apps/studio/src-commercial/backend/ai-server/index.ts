import os from "os";
import bksConfig from "@/common/bksConfig";
import platformInfo from "@/common/platform_info";
import rawLog from "@bksLogger";
import { generateToken } from "./auth";
import { startHttpServer, RunningHttpServer } from "./HttpServer";
import { writePortFile, removePortFile } from "./portFile";
import { configure as configureLog, shutdown as shutdownLog, subscribe as subscribeLog } from "./queryLog";
import { forgetAll } from "./sessionRegistry";
import { loadOptions } from "./options";
import { AiServerStatus, AiServerLogEntry, AiServerOptions, DEFAULT_OPTIONS } from "./types";

const log = rawLog.scope("ai-server");

const LOOPBACK = "127.0.0.1";
const ALL_INTERFACES = "0.0.0.0";

interface RuntimeState {
  running: RunningHttpServer | null;
  token: string | null;
  startedAt: string | null;
  options: AiServerOptions;
  unsubscribeLog: (() => void) | null;
}

const runtime: RuntimeState = {
  running: null,
  token: null,
  startedAt: null,
  options: { ...DEFAULT_OPTIONS },
  unsubscribeLog: null,
};

type StatusListener = (status: AiServerStatus) => void;
type LogListener = (entry: AiServerLogEntry) => void;

const statusListeners = new Set<StatusListener>();
const logListeners = new Set<LogListener>();

export function onStatusChange(fn: StatusListener): () => void {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

export function onLogAppend(fn: LogListener): () => void {
  logListeners.add(fn);
  return () => logListeners.delete(fn);
}

function lanAddresses(): string[] {
  const out: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const i of list ?? []) {
      if (!i.internal && i.family === "IPv4") out.push(i.address);
    }
  }
  return out;
}

export function getStatus(): AiServerStatus {
  const running = !!runtime.running;
  return {
    running,
    configDisabled: !!bksConfig.aiServer.disabled,
    host: runtime.running?.host ?? (runtime.options.bindLocal ? ALL_INTERFACES : LOOPBACK),
    port: runtime.running?.port ?? bksConfig.aiServer.port,
    startedAt: runtime.startedAt,
    pid: running ? process.pid : null,
    requireToken: runtime.options.requireToken,
    bindLocal: runtime.options.bindLocal,
    lanAddresses: running && runtime.options.bindLocal ? lanAddresses() : [],
  };
}

export function getToken(): string | null {
  return runtime.token;
}

export function getOptions(): AiServerOptions {
  return { ...runtime.options };
}

export async function refreshOptions(): Promise<AiServerOptions> {
  runtime.options = await loadOptions();
  return runtime.options;
}

function emitStatus(): void {
  const s = getStatus();
  for (const fn of statusListeners) {
    try { fn(s); } catch (e) { log.warn("status listener", e); }
  }
}

export async function startAiServer(): Promise<AiServerStatus> {
  if (runtime.running) return getStatus();
  if (bksConfig.aiServer.disabled) {
    throw new Error("AI server is disabled by config (aiServer.disabled = true)");
  }

  await refreshOptions();

  configureLog({
    ringBufferSize: bksConfig.aiServer.logRingBufferSize,
    persist: bksConfig.aiServer.logQueries,
  });

  const host = runtime.options.bindLocal ? ALL_INTERFACES : LOOPBACK;
  const token = runtime.options.requireToken ? generateToken() : null;

  const running = await startHttpServer({
    host,
    port: bksConfig.aiServer.port,
    portScanRange: bksConfig.aiServer.portScanRange,
    token,
  });

  runtime.running = running;
  runtime.token = token;
  runtime.startedAt = new Date().toISOString();

  writePortFile({
    version: 1,
    host: running.host,
    port: running.port,
    pid: process.pid,
    appVersion: platformInfo.appVersion,
    startedAt: runtime.startedAt,
    requireToken: runtime.options.requireToken,
  });

  runtime.unsubscribeLog = subscribeLog((entry) => {
    for (const fn of logListeners) {
      try { fn(entry); } catch (e) { log.warn("log listener", e); }
    }
  });

  log.info("AI server started", running.host, running.port, "token-required:", runtime.options.requireToken);
  emitStatus();
  return getStatus();
}

export async function stopAiServer(): Promise<AiServerStatus> {
  if (!runtime.running) return getStatus();
  const r = runtime.running;
  runtime.running = null;
  runtime.token = null;
  runtime.startedAt = null;
  if (runtime.unsubscribeLog) {
    runtime.unsubscribeLog();
    runtime.unsubscribeLog = null;
  }
  forgetAll();
  removePortFile();
  try {
    await r.close();
  } catch (e) {
    log.warn("close error", e);
  }
  log.info("AI server stopped");
  emitStatus();
  return getStatus();
}

export async function regenerateToken(): Promise<AiServerStatus> {
  if (!runtime.running) {
    throw new Error("server not running");
  }
  await stopAiServer();
  return startAiServer();
}

export async function initAiServer(): Promise<void> {
  // Remove any stale port file from a previous run. Do NOT auto-start —
  // the server only runs when the user clicks Start in the AI Server panel.
  removePortFile();
  await refreshOptions();
  emitStatus();
}

export async function shutdownAiServer(): Promise<void> {
  try {
    await stopAiServer();
  } finally {
    shutdownLog();
    statusListeners.clear();
    logListeners.clear();
  }
}
