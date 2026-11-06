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
  | 'PLUGIN_VIEW_NOT_FOUND'
  | 'PLUGIN_NOT_SUPPORTED'
  | 'PLUGIN_SYSTEM_DISABLED'
  | 'INIT_TIMEOUT'
  | 'PLUGIN_LIMIT_REACHED'
  | 'CHECKSUM_MISMATCH';

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

export type ExtensionRepositoryErrorCode =
  | "LATEST_RELEASE_NOT_FOUND"
  | "RELEASE_ASSET_NOT_FOUND";

/** Thrown when an extension's repository doesn't have a usable release. */
export class ExtensionRepositoryError extends Error {
  constructor(
    public readonly code: ExtensionRepositoryErrorCode,
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

export type ExtensionRegistryErrorCode = "ENTRY_NOT_FOUND";

/** Thrown when an extension can't be found in any registry. */
export class ExtensionRegistryError extends Error {
  constructor(
    public readonly code: ExtensionRegistryErrorCode,
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

export type ThemeSystemErrorCode =
  | "THEME_ID_RESERVED"
  | "THEME_NOT_FOUND"
  | "MANIFEST_ID_MISMATCH";

export class ThemeSystemError extends Error {
  constructor(
    public readonly code: ThemeSystemErrorCode,
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

/** Thrown when a path would resolve outside the directory it must stay in. */
export class PathTraversalError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Thrown when a manifest.json is malformed or does not match where it was found. */
export class ManifestError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** Thrown when a downloaded archive does not match its published checksum. */
export class ChecksumMismatchError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
