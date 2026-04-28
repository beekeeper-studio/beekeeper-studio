import {
  startAiServer,
  stopAiServer,
  getStatus,
  getToken,
  regenerateToken,
  onLogAppend,
  onStatusChange,
} from "@commercial/backend/ai-server";
import { loadGrants, saveGrants } from "@commercial/backend/ai-server/grants";
import { recent as recentLog, clear as clearLog } from "@commercial/backend/ai-server/queryLog";
import { AiServerGrants, AiServerLogEntry, AiServerStatus } from "@commercial/backend/ai-server/types";
import { state } from "@/handlers/handlerState";
import bksConfig from "@/common/bksConfig";

export interface IAiServerHandlers {
  "ai-server/status": (args: { sId?: string }) => Promise<AiServerStatus & { token: string | null }>;
  "ai-server/start": (args: { sId?: string }) => Promise<AiServerStatus & { token: string | null }>;
  "ai-server/stop": (args: { sId?: string }) => Promise<AiServerStatus>;
  "ai-server/regenerateToken": (args: { sId?: string }) => Promise<AiServerStatus & { token: string | null }>;
  "ai-server/grants/get": (args: { sId?: string }) => Promise<AiServerGrants>;
  "ai-server/grants/set": (args: { grants: AiServerGrants; sId?: string }) => Promise<AiServerGrants>;
  "ai-server/log/list": (args: { limit?: number; since?: number; sId?: string }) => Promise<AiServerLogEntry[]>;
  "ai-server/log/clear": (args: { sId?: string }) => Promise<{ ok: true }>;
}

function withToken<T extends AiServerStatus>(s: T): T & { token: string | null } {
  return { ...s, token: getToken() };
}

export const AiServerHandlers: IAiServerHandlers = {
  "ai-server/status": async () => withToken(getStatus()),
  "ai-server/start": async () => {
    await startAiServer();
    return withToken(getStatus());
  },
  "ai-server/stop": async () => stopAiServer(),
  "ai-server/regenerateToken": async () => {
    await regenerateToken();
    return withToken(getStatus());
  },
  "ai-server/grants/get": async () => loadGrants(),
  "ai-server/grants/set": async ({ grants }) => saveGrants(grants),
  "ai-server/log/list": async ({ limit, since }) => recentLog({ limit, since }),
  "ai-server/log/clear": async () => {
    clearLog();
    return { ok: true };
  },
};

interface SubscribedPort {
  sId: string;
}

const subscribedPorts = new Map<string, SubscribedPort>();
let installedListeners = false;

function broadcastLog(entry: AiServerLogEntry): void {
  for (const sub of subscribedPorts.values()) {
    try {
      state(sub.sId)?.port?.postMessage({
        type: "aiServerLogAppend",
        input: entry,
      });
    } catch {
      // ignore — port may be closed
    }
  }
}

function broadcastStatus(status: AiServerStatus): void {
  const payload = withToken(status);
  for (const sub of subscribedPorts.values()) {
    try {
      state(sub.sId)?.port?.postMessage({
        type: "aiServerStatusChanged",
        input: payload,
      });
    } catch {
      // ignore
    }
  }
}

export function registerAiServerSubscriber(sId: string): void {
  subscribedPorts.set(sId, { sId });
  if (!installedListeners) {
    installedListeners = true;
    onLogAppend(broadcastLog);
    onStatusChange(broadcastStatus);
  }
}

export function unregisterAiServerSubscriber(sId: string): void {
  subscribedPorts.delete(sId);
}

export function aiServerEnabledByConfig(): boolean {
  return !bksConfig.aiServer.disabled;
}
