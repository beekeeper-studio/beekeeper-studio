// Copyright (c) 2015 The SQLECTRON Team

export interface Error {
  code: string;
  name: string;
  message: string;
}

export const errors: {[code: string]: Error} = {
  CANCELED_BY_USER: {
    code: 'CANCELED_BY_USER',
    name: 'Query canceled by user',
    message: 'Query canceled by user. The query process may still in the process list. But has already received the command to kill it successfully.',
  }
};

export type PluginSystemErrorCode =
  | 'UNKNOWN'
  | 'INIT_FAILURE'
  | 'REGISTRY_LOAD'
  | 'PLUGIN_DIR_NOT_FOUND'
  | 'FILE_ACCESS_DENIED'
  | 'STORAGE_READ_ERROR'
  | 'STORAGE_WRITE_ERROR'
  | 'PLUGIN_NOT_FOUND'
  | 'PLUGIN_LATEST_RELEASE_NOT_FOUND'
  | 'PLUGIN_RELEASE_ASSET_NOT_FOUND'
  | 'PLUGIN_VIEW_NOT_FOUND'
  | 'PLUGIN_NOT_SUPPORTED'
  | 'PLUGIN_SYSTEM_DISABLED'
  | 'INIT_TIMEOUT';

export type PluginErrorCode =
  | 'UNKNOWN'
  | 'MANIFEST_PARSE'
  | 'NOT_INSTALLED'
  | 'LOAD_ERROR'
  | 'API_NOT_SUPPORTED'
  | 'RUNTIME_EXCEPTION'
  | 'DEPENDENCY_MISSING';

/**
 * Thrown by the plugin system itself — registry lookups, install/update
 * flows, IPC timeouts, asset resolution. Raised by Beekeeper, not by a
 * plugin's own code.
 */
export class PluginSystemError extends Error {
  constructor(
    public readonly code: PluginSystemErrorCode,
    message?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown for failures attributable to an installed plugin — malformed
 * manifest, load-time crashes, runtime exceptions, missing dependencies.
 * The fault lies with the plugin, not the system hosting it.
 */
export class PluginError extends Error {
  constructor(
    public readonly code: PluginErrorCode,
    message?: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
