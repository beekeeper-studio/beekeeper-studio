import { EventEmitter } from "events";
import Vue from "vue";
import { newState, removeState, state } from "@/handlers/handlerState";
import { BackupHandlers } from "@commercial/backend/handlers/backupHandlers";
import { TempHandlers } from "@/handlers/tempHandlers";
import { uuidv4 } from "@/lib/uuid";
import os from "os";

const handlers: Record<string, (args: any) => Promise<any>> = {
  ...BackupHandlers,
  ...TempHandlers,
};

export interface UtilStub {
  sId: string;
  dispose(): Promise<void>;
}

// Install a stub for Vue.prototype.$util that routes calls into the real
// backend handlers (BackupHandlers, TempHandlers) instead of going through the
// utility-process IPC. This lets us exercise BaseCommandClient and the
// backup-clients end-to-end from a Node-side jest test without spinning up
// Electron.
export function installUtilStub(): UtilStub {
  ensurePlatformInfo();

  const sId = uuidv4();
  newState(sId);

  // The real handler code calls `state(sId).port.postMessage({ type, input })`
  // to emit notifications and log chunks. We route those through an
  // EventEmitter so $util.addListener can subscribe to them.
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  (state(sId) as any).port = {
    postMessage: ({ type, input }: { type: string; input: unknown }) => {
      emitter.emit(type, input);
    },
    close: () => undefined,
    on: () => undefined,
    start: () => undefined,
  };

  const tokens = new Map<symbol, { event: string; fn: (...args: any[]) => void }>();

  Vue.prototype.$util = {
    send: async (name: string, args: Record<string, unknown> = {}) => {
      const handler = handlers[name];
      if (!handler) {
        throw new Error(`installUtilStub: no handler registered for "${name}"`);
      }
      // `this` is referenced by BackupHandlers (recursive postCommand calls)
      return handler.call(handlers, { ...args, sId });
    },
    addListener: (event: string, fn: (...args: any[]) => void) => {
      const token = Symbol(event);
      tokens.set(token, { event, fn });
      emitter.on(event, fn);
      return token;
    },
    removeListener: (token: symbol) => {
      const entry = tokens.get(token);
      if (!entry) return;
      emitter.off(entry.event, entry.fn);
      tokens.delete(token);
    },
  };

  return {
    sId,
    dispose: async () => {
      emitter.removeAllListeners();
      tokens.clear();
      await removeState(sId);
    },
  };
}

function ensurePlatformInfo() {
  const g = globalThis as any;
  // BaseCommandClient reads `window.platformInfo.*`. Under the `node` test
  // environment there is no `window`, so alias it to globalThis. (In jsdom,
  // `window === globalThis` already, so this is a no-op.)
  if (typeof g.window === "undefined") {
    g.window = g;
  }
  if (g.platformInfo && typeof g.platformInfo.isWindows === "boolean") return;
  g.platformInfo = {
    ...(g.platformInfo ?? {}),
    isWindows: process.platform === "win32",
    isMac: process.platform === "darwin",
    isLinux: process.platform === "linux",
    downloadsDirectory: os.tmpdir(),
  };
}
