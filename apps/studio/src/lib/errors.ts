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

export enum BksErrorCode {
  UNKNOWN = 0,
}

export enum PluginSystemErrorCode {
  UNKNOWN = 1000,
  INIT_FAILURE = 1001,
  REGISTRY_LOAD = 1002,
  PLUGIN_DIR_NOT_FOUND = 1003,
  FILE_ACCESS_DENIED = 1004,
  STORAGE_READ_ERROR = 1005,
  STORAGE_WRITE_ERROR = 1006,
  PLUGIN_NOT_FOUND = 1007,
  PLUGIN_LATEST_RELEASE_NOT_FOUND = 1008,
  PLUGIN_RELEASE_ASSET_NOT_FOUND = 1009,
}

export enum PluginErrorCode {
  UNKNOWN = 2000,
  MANIFEST_PARSE = 2001,
  NOT_INSTALLED = 2002,
  LOAD_ERROR = 2003,
  API_NOT_SUPPORTED = 2004,
  RUNTIME_EXCEPTION = 2005,
  DEPENDENCY_MISSING = 2006,
}

type BksErrorCodeType = BksErrorCode | PluginSystemErrorCode | PluginErrorCode;

export class BksError extends Error {
  constructor(
    message: string,
    public readonly code: BksErrorCodeType = BksErrorCode.UNKNOWN,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
