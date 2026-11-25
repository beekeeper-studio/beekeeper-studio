import type {
  ExtensionRegistryErrorCode,
  ExtensionRepositoryErrorCode,
  PluginErrorCode,
  PluginSystemErrorCode,
  ThemeSystemErrorCode,
} from "@/lib/errors";

/** The answer to a request, sent back over a message port. */
export interface Reply {
  id: string,
  type: 'reply' | 'error',
  data?: any,
  error?: string
  errorName?: "PluginSystemError" | "PluginError" | "ExtensionRegistryError" | "ExtensionRepositoryError" | "ThemeSystemError" | "Error"
  errorCode?: PluginSystemErrorCode | PluginErrorCode | ExtensionRegistryErrorCode | ExtensionRepositoryErrorCode | ThemeSystemErrorCode
  errorDetail?: string
  errorHint?: string
  stack?: string
}
