import bksConfig from "@/common/bksConfig";
import platformInfo from "@/common/platform_info";
import rawLog from "@bksLogger";
import { generateToken } from "./auth";
import { startHttpServer, RunningHttpServer } from "./HttpServer";
import { writePortFile, removePortFile } from "./portFile";
import { configure as configureLog, shutdown as shutdownLog, subscribe as subscribeLog } from "./queryLog";
import { forgetAll } from "./sessionRegistry";
import { AiServerStatus, AiServerLogEntry } from "./types";

const log = rawLog.scope("ai-server");

interface RuntimeState {
  running: RunningHttpServer | null;
  token: string | null;
  startedAt: string | null;
  unsubscribeLog: (() => void) | null;
}

const runtime: RuntimeState = {
  running: null,
  token: null,
  startedAt: null,
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

export function getStatus(): AiServerStatus {
  return {
    running: !!runtime.running,
    configDisabled: !!bksConfig.aiServer.disabled,
    host: runtime.running?.host ?? bksConfig.aiServer.host,
    port: runtime.running?.port ?? bksConfig.aiServer.port,
    startedAt: runtime.startedAt,
    pid: runtime.running ? process.pid : null,
  };
}

export function getToken(): string | null {
  return runtime.token;
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

  configureLog({
    ringBufferSize: bksConfig.aiServer.logRingBufferSize,
    persist: bksConfig.aiServer.logQueries,
  });

  const token = generateToken();
  const running = await startHttpServer({
    host: bksConfig.aiServer.host,
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
    token,
    pid: process.pid,
    appVersion: platformInfo.appVersion,
    startedAt: runtime.startedAt,
  });

  runtime.unsubscribeLog = subscribeLog((entry) => {
    for (const fn of logListeners) {
      try { fn(entry); } catch (e) { log.warn("log listener", e); }
    }
  });

  log.info("AI server started", running.host, running.port);
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
