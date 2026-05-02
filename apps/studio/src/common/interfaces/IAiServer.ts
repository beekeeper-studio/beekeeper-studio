export interface AiServerConnectionGrant {
  connectionId: number;
  readOnly: boolean;
  maxRows?: number;
}

export interface AiServerGrants {
  connections: AiServerConnectionGrant[];
  queries: number[];
  workspaceIds: number[];
}

export const EMPTY_GRANTS: AiServerGrants = Object.freeze({
  connections: [],
  queries: [],
  workspaceIds: [],
}) as AiServerGrants;

export interface AiServerOptions {
  requireToken: boolean;
  bindLocal: boolean;
}

export const DEFAULT_OPTIONS: AiServerOptions = Object.freeze({
  requireToken: true,
  bindLocal: false,
}) as AiServerOptions;

export interface AiServerStatus {
  running: boolean;
  configDisabled: boolean;
  host: string;
  port: number;
  startedAt: string | null;
  pid: number | null;
  requireToken: boolean;
  bindLocal: boolean;
  lanAddresses: string[];
}

export interface AiServerStatusWithToken extends AiServerStatus {
  token: string | null;
}

export interface AiServerPortFileV1 {
  version: 1;
  host: string;
  port: number;
  pid: number;
  appVersion: string;
  startedAt: string;
  requireToken: boolean;
}

export interface AiServerLogEntry {
  id: string;
  ts: number;
  connectionId: number;
  connectionName: string;
  database: string | null;
  sql: string;
  rowCount: number;
  truncated: boolean;
  durationMs: number;
  readOnly: boolean;
  error?: string;
}
