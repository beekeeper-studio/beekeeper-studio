import type {
  ExtensionRegistryErrorCode,
  ExtensionRepositoryErrorCode,
  PluginErrorCode,
  PluginSystemErrorCode,
  ThemeSystemErrorCode,
} from "@/lib/errors";

export type Method = (...args: unknown[]) => unknown;

/** A call to a named handler, posted over a message port. */
export interface Request {
  id: string;
  name: string;
  args: unknown;
}

/** A one-way message to a named handler. Nothing is sent back. */
export interface Notification {
  name: string;
  args: unknown;
}

export interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
  errorName?: "PluginSystemError" | "PluginError" | "ExtensionRegistryError" | "ExtensionRepositoryError" | "ThemeSystemError" | "CancelError" | "Error"
  errorCode?: PluginSystemErrorCode | PluginErrorCode | ExtensionRegistryErrorCode | ExtensionRepositoryErrorCode | ThemeSystemErrorCode
  errorDetail?: string
  errorHint?: string
  stack?: string
}

export interface RequestOptions {
  /** Id for this request, so it can be cancelled with cancel(). Generated when left out. */
  id?: string;
  signal?: AbortSignal;
}
