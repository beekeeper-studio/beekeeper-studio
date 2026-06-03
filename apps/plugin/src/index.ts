import type {
  AppInfo,
  AppTheme,
  Column,
  ConfirmOptions,
  ConnectionInfo,
  JsonValue,
  OpenQueryTabOptions,
  OpenTableStructureTabOptions,
  OpenTableTableTabOptions,
  PluginErrorObject,
  PluginViewContext,
  PrimaryKey,
  QueryResult,
  RequestFileSaveOptions,
  RunQueryResult,
  Table,
  TableIndex,
  TableKey,
  WindowEventObject,
  WorkspaceInfo,
} from "./types";
import type { RequestMap } from "./internal";

export * from "./types";

/**
 * Get a list of schemas from the current database.
 *
 * @since Beekeeper Studio 5.5.0
 **/
export async function getSchemas(): Promise<string[]> {
  return await request({ name: "getSchemas", args: void 0 });
}

/**
 * Get a list of tables from the current database.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function getTables(schema?: string): Promise<Table[]> {
  return await request({ name: "getTables", args: { schema } });
}

/**
 * Get a list of columns from a table.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function getColumns(
  table: string,
  schema?: string,
): Promise<Column[]> {
  return await request({ name: "getColumns", args: { table, schema } });
}

/** @since Beekeeper Studio 5.4.0 */
export async function getTableKeys(
  table: string,
  schema?: string,
): Promise<TableKey[]> {
  return await request({ name: "getTableKeys", args: { table, schema } });
}

/** @since Beekeeper Studio 5.5.0 */
export async function getTableIndexes(
  table: string,
  schema?: string,
): Promise<TableIndex[]> {
  return await request({ name: "getTableIndexes", args: { table, schema } });
}

export async function getPrimaryKeys(
  table: string,
  schema?: string,
): Promise<PrimaryKey[]> {
  return await request({ name: "getPrimaryKeys", args: { table, schema } });
}

export async function getIncomingKeys(
  table: string,
  schema?: string,
): Promise<TableKey[]> {
  return await request({ name: "getIncomingKeys", args: { table, schema } });
}

export async function getOutgoingKeys(
  table: string,
  schema?: string,
): Promise<TableKey[]> {
  return await request({ name: "getOutgoingKeys", args: { table, schema } });
}

/**
 * Get information about the current database connection.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function getConnectionInfo(): Promise<ConnectionInfo> {
  return await request({ name: "getConnectionInfo", args: void 0 });
}

/**
 * Get information about the current workspace.
 *
 * @since Beekeeper Studio 5.5.?
 **/
export async function getWorkspaceInfo(): Promise<WorkspaceInfo> {
  return await request({ name: "getWorkspaceInfo", args: void 0 });
}

/** @since Beekeeper Studio 5.4.0 */
export async function getAppInfo(): Promise<AppInfo> {
  return await request({ name: "getAppInfo", args: void 0 });
}

/**
 * Get the version of Beekeeper Studio
 * @since Beekeeper Studio 5.3.0
 **/
export async function getAppVersion(): Promise<
  "5.3" | (string & { __brand?: never })
> {
  try {
    const appInfo = await getAppInfo();
    return appInfo.version;
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unknown request")) {
      return "5.3";
    }
    throw e;
  }
}

/**
 * Check if plugin's update is available.
 *
 * @since Beekeeper Studio 5.4.0
 **/
export async function checkForUpdate(): Promise<boolean> {
  return await request({ name: "checkForUpdate", args: void 0 });
}

/**
 * Execute a SQL query against the current database.
 *
 * WARNING: The query will be executed exactly as provided with no modification
 * or sanitization. Always validate and sanitize user input before including it
 * in queries to prevent unwanted actions.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function runQuery(query: string): Promise<RunQueryResult> {
  return await request({ name: "runQuery", args: { query } });
}

/**
 * Display query results in the bottom table panel (shell-type tabs only).
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function expandTableResult(results: QueryResult[]): Promise<void> {
  return await request({ name: "expandTableResult", args: { results } });
}

/**
 * Set the title of the current plugin tab.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export async function setTabTitle(title: string): Promise<void> {
  return await request({ name: "setTabTitle", args: { title } });
}

/**
 * Get the current view context.
 *
 * A view context describes how this plugin view was opened and what data is
 * available for it. It always includes the static `command` from your
 * `manifest.json`, and may also include dynamic `params` depending on where
 * the menu was invoked.
 *
 * @since Beekeeper Studio 5.4.0
 **/
export async function getViewContext(): Promise<PluginViewContext> {
  return await request({ name: "getViewContext", args: void 0 });
}

/**
 * Get the current state of your view instance.
 *
 * @see {@link https://docs.beekeeperstudio.io/plugin_development/plugin-views/#view-state|View State}
 * @since Beekeeper Studio 5.3.0
 **/
export async function getViewState<T = unknown>(): Promise<T> {
  return await request({ name: "getViewState", args: void 0 });
}

/**
 * Set the state of your view instance.
 *
 * @see {@link https://docs.beekeeperstudio.io/plugin_development/plugin-views/#view-state|View State}
 * @since Beekeeper Studio 5.3.0
 **/
export async function setViewState<T = unknown>(state: T): Promise<void> {
  return await request({ name: "setViewState", args: { state } });
}

/** @since Beekeeper Studio 5.3.0 */
export async function openExternal(link: string): Promise<void> {
  return await request({ name: "openExternal", args: { link } });
}

/** @since Beekeeper Studio 5.4.0 */
export async function openTab(
  type: "query",
  options?: OpenQueryTabOptions,
): Promise<void>;
export async function openTab(
  type: "tableTable",
  options: OpenTableTableTabOptions,
): Promise<void>;
export async function openTab(
  type: "tableStructure",
  options: OpenTableStructureTabOptions,
): Promise<void>;
export async function openTab(
  type: "query" | "tableTable" | "tableStructure",
  options?:
    | OpenQueryTabOptions
    | OpenTableTableTabOptions
    | OpenTableStructureTabOptions,
): Promise<void> {
  return await request({ name: "openTab", args: { type, ...options } });
}

export async function requestFileSave(
  options: RequestFileSaveOptions,
): Promise<void> {
  return await request({ name: "requestFileSave", args: options });
}

export async function showStatusBarUI(): Promise<void> {
  return await request({ name: "toggleStatusBarUI", args: { force: true } });
}

export async function hideStatusBarUI(): Promise<void> {
  return await request({ name: "toggleStatusBarUI", args: { force: false } });
}

/** @since Beekeeper Studio 5.5.? */
export async function toggleStatusBarUI(): Promise<void> {
  return await request({ name: "toggleStatusBarUI", args: void 0 });
}

/** @since Beekeeper Studio 5.5.? */
export async function confirm(
  title?: string,
  message?: string,
  options?: ConfirmOptions,
): Promise<boolean> {
  return await request({ name: "confirm", args: { title, message, options } });
}

/** @since Beekeeper Studio 5.4.0 */
export const broadcast = {
  post<T extends JsonValue = JsonValue>(message: T): void {
    return notify("broadcast", { message });
  },
  on<T extends JsonValue = JsonValue>(handler: (message: T) => void): void {
    addNotificationListener<T>("broadcast", (params) => {
      handler(params.message);
    });
  },
};

class PluginLog {
  error(err: string | Error): void {
    const logStack = new Error().stack!;

    if (typeof err === "string") {
      return notify("pluginError", {
        name: "Error",
        message: err,
        stack: logStack,
        logStack,
      });
    }
    return notify("pluginError", {
      name: err.name || "Error",
      message: err.message,
      stack: err.stack,
      logStack,
    });
  }
}

/** @since Beekeeper Studio 5.3.0 */
export const log = new PluginLog();

/** Clipboard interface. */
export const clipboard = {
  /** Write text to the Electron clipboard.
   * @since Beekeeper Studio 5.3.0 */
  async writeText(text: string): Promise<void> {
    await request({
      name: "clipboard.writeText",
      args: { text },
    });
  },
  /** Read text from the Electron clipboard.
   * @since Beekeeper Studio 5.3.0 */
  async readText(): Promise<string> {
    return await request({
      name: "clipboard.readText",
      args: void 0,
    });
  },
  /** @param data - Base64 encoded image data.
   * @since Beekeeper Studio 5.5.0 */
  async writeImage(data: string) {
    await request({
      name: "clipboard.writeImage",
      args: { data },
    });
  },
  // async write() {},
  // async read() {},
};

/**
 * Similar to `localStorage`, `appStorage` is a persistent storage that persists
 * across sessions. The data is stored in the local database of the app and
 * scoped to the plugin.
 *
 * @since Beekeeper Studio 5.3.0
 **/
export const appStorage = {
  async getItem<T = unknown>(
    key: string,
    options?: {
      encrypted: boolean;
    },
  ): Promise<T | null> {
    if (options?.encrypted) {
      return await request({
        name: "getEncryptedData",
        args: { key },
      });
    }
    return await request({ name: "getData", args: { key } });
  },
  async setItem<T = unknown>(
    key: string,
    value: T,
    options?: {
      encrypted: boolean;
    },
  ): Promise<void> {
    if (options?.encrypted) {
      return await request({
        name: "setEncryptedData",
        args: { key, value },
      });
    }
    return await request({ name: "setData", args: { key, value } });
  },
  // TODO
  // async removeItem(key: string): Promise<void> {},
  // async clear(): Promise<void> {},
};

export const cloudStorage = {
  connection: {
    async getItem<T = unknown>(key: string): Promise<T | null> {
      return await request({
        name: "cloudStorage.connection.getItem",
        args: { key },
      });
    },
    async setItem<T = unknown>(key: string, value: T): Promise<void> {
      return await request({
        name: "cloudStorage.connection.setItem",
        args: { key, value },
      });
    },
  },
  // TODO
  // async removeItem(key: string): Promise<void> {},
  // async clear(): Promise<void> {},
};

/** @since Beekeeper Studio 5.5.? */
export const noty = {
  async success(message: string): Promise<void> {
    return await request({
      name: "noty.success",
      args: { message },
    });
  },
  async info(message: string): Promise<void> {
    return await request({
      name: "noty.info",
      args: { message },
    });
  },
  async warning(message: string): Promise<void> {
    return await request({
      name: "noty.warning",
      args: { message },
    });
  },
  async error(message: string): Promise<void> {
    return await request({
      name: "noty.error",
      args: { message },
    });
  },
};

let debugComms = false;

export function setDebugComms(enabled: boolean) {
  debugComms = enabled;
}

export function notify<Message extends JsonValue = JsonValue>(
  name: "broadcast",
  args: { message: Message },
): void;
export function notify(name: "pluginError", args: PluginErrorObject): void;
export function notify(name: "windowEvent", args: WindowEventObject): void;
export function notify(name: string, args: any) {
  const payload = { name, args };
  if (debugComms) {
    const time = new Date().toLocaleTimeString("en-GB");
    console.groupCollapsed(`${time} [NOTIFICATION] ${name}`);
    console.log("args:", args);
    console.log("payload:", payload);
    console.groupEnd();
  }
  window.parent.postMessage(payload, "*");
}

export function addNotificationListener(
  name: "tablesChanged",
  handler: () => void,
): void;
export function addNotificationListener<Message extends JsonValue = JsonValue>(
  name: "broadcast",
  handler: (args: { message: Message }) => void,
): void;
export function addNotificationListener(
  name: "themeChanged",
  handler: (args: AppTheme) => void,
): void;
export function addNotificationListener(
  name: "dataPollSucceeded",
  handler: () => void,
): void;
export function addNotificationListener(
  name: string,
  handler: (args: any) => void,
) {
  if (!notificationListeners.get(name)) {
    notificationListeners.set(name, []);
  }
  notificationListeners.get(name)!.push(handler);
}

export function removeNotificationListener(
  name: "tablesChanged",
  handler: (args: any) => void,
): void;
export function removeNotificationListener<
  Message extends JsonValue = JsonValue,
>(name: "broadcast", handler: (args: any) => void): void;
export function removeNotificationListener(
  name: "themeChanged",
  handler: (args: any) => void,
): void;
export function removeNotificationListener(
  name: string,
  handler: (args: any) => void,
) {
  const handlers = notificationListeners.get(name);
  if (handlers) {
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}

const pendingRequests = new Map<
  string,
  {
    // The whole payload is kept just in case for debugging
    payload: any;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }
>();

export async function request<T extends keyof RequestMap>(raw: {
  name: T;
  args: RequestMap[T]["args"];
}): Promise<RequestMap[T]["return"]> {
  const payload = { id: generateUUID(), ...raw };

  if (debugComms) {
    const time = new Date().toLocaleTimeString("en-GB");
    console.groupCollapsed(`${time} [REQUEST] ${payload.name}`);
    console.log("id:", payload.id);
    console.log("args:", payload.args);
    console.log("payload:", payload);
    console.groupEnd();
  }

  return new Promise<any>((resolve, reject) => {
    try {
      pendingRequests.set(payload.id, { payload: payload, resolve, reject });
      window.parent.postMessage(payload, "*");
    } catch (e) {
      reject(e);
    }
  });
}

const notificationListeners = new Map<string, ((args: any) => void)[]>();

window.addEventListener("message", (event) => {
  const { id, name, args, result, error } = event.data || {};

  if (name) {
    if (debugComms) {
      const time = new Date().toLocaleTimeString("en-GB");
      console.groupCollapsed(`${time} [NOTIFICATION] ${name}`);
      console.log("Args:", args);
      console.groupEnd();
    }

    const handlers = notificationListeners.get(name);
    if (handlers) {
      handlers.forEach((handler) => handler(args));
    }
  }

  if (id && pendingRequests.has(id)) {
    const { resolve, reject, payload } = pendingRequests.get(id)!;
    pendingRequests.delete(id);

    if (debugComms) {
      const time = new Date().toLocaleTimeString("en-GB");
      console.groupCollapsed(`${time} [RESPONSE] ${payload.name}`);
      console.log("Result:", result);
      if (error) console.error("Error:", error);
      console.groupEnd();
    }

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  }
});

function generateUUID() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);

  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant

  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20),
  ].join("-");
}
