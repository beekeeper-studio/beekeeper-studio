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

export interface AiServerStatus {
  running: boolean;
  configDisabled: boolean;
  host: string;
  port: number;
  startedAt: string | null;
  pid: number | null;
}

export interface AiServerStatusWithToken extends AiServerStatus {
  token: string | null;
}

export interface AiServerPortFileV1 {
  version: 1;
  host: string;
  port: number;
  token: string;
  pid: number;
  appVersion: string;
  startedAt: string;
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
