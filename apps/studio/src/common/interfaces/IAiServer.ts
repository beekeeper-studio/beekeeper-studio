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
  /** Start the server automatically when Beekeeper Studio launches. */
  autoStart: boolean;
  /** When false, every connection is forced read-only regardless of grant. */
  allowWrites: boolean;
  /** Show an in-app approve/deny prompt the first time a new client connects. */
  promptForNewClients: boolean;
}

export const DEFAULT_OPTIONS: AiServerOptions = Object.freeze({
  requireToken: true,
  bindLocal: false,
  autoStart: false,
  allowWrites: false,
  promptForNewClients: true,
}) as AiServerOptions;

export type AiServerClientStatus = "approved" | "denied" | "pending";

/** A client that has been seen by the AI server, with its approval decision. */
export interface AiServerClient {
  /** Stable identity — an explicit client id header, or a hash of the user-agent. */
  id: string;
  name: string;
  userAgent: string;
  status: AiServerClientStatus;
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
}

/** Pushed to the renderer when an unknown client needs an approve/deny decision. */
export interface AiServerAccessRequest {
  id: string;
  name: string;
  userAgent: string;
  address: string;
  requestedAt: number;
}

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
