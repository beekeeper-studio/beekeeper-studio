/**
 * Shared types for the `beekeeper-studio cli` interface.
 *
 * The CLI is a thin client. The Beekeeper Studio binary, started with `cli`
 * as its first argument, sends a single JSON request over a local socket to
 * the running app (the utility process, which owns the live database
 * connections) and prints the JSON reply. Both ends and the tests import this
 * file, so nothing in here may depend on electron.
 */

export const CLI_PROTOCOL_VERSION = 1

/** Hard cap on the number of rows a single `query` result returns. */
export const CLI_MAX_QUERY_ROWS = 20000

export const CLI_COMMANDS = [
  'connections',
  'list-schemas',
  'list-tables',
  'list-entities',
  'structure',
  'query',
] as const

export type CliCommandName = typeof CLI_COMMANDS[number]

export const CLI_ENTITY_TYPES = ['table', 'view', 'materialized-view', 'routine'] as const

export type CliEntityType = typeof CLI_ENTITY_TYPES[number]

export interface CliCommandArgs {
  /** Name or id of the open connection to use. Optional when exactly one is enabled. */
  connection?: string
  /** Schema filter for list-tables, list-entities and structure. */
  schema?: string
  /** Entity types for list-entities. Defaults to every type. */
  entityTypes?: CliEntityType[]
  /** Table or view name for structure. */
  name?: string
  /** SQL text for query. */
  sql?: string
}

export interface CliRequest {
  version: number
  command: CliCommandName
  args: CliCommandArgs
}

export type CliErrorCode =
  | 'USAGE'
  | 'NOT_RUNNING'
  | 'NO_OPEN_CONNECTIONS'
  | 'CLI_DISABLED'
  | 'UNKNOWN_CONNECTION'
  | 'AMBIGUOUS_CONNECTION'
  | 'NOT_FOUND'
  | 'AMBIGUOUS_ENTITY'
  | 'QUERY_FAILED'
  | 'INTERNAL'

export interface CliErrorPayload {
  code: CliErrorCode
  message: string
  /** What to do about it. Written for whoever (or whatever) reads the terminal. */
  hint?: string
  details?: unknown
}

export type CliResponse =
  | { ok: true; result: unknown }
  | { ok: false; error: CliErrorPayload }

export class CliError extends Error {
  code: CliErrorCode
  hint?: string
  details?: unknown

  constructor(code: CliErrorCode, message: string, options: { hint?: string; details?: unknown } = {}) {
    super(message)
    this.name = 'CliError'
    this.code = code
    this.hint = options.hint
    this.details = options.details
  }

  toPayload(): CliErrorPayload {
    const payload: CliErrorPayload = { code: this.code, message: this.message }
    if (this.hint) payload.hint = this.hint
    if (this.details !== undefined) payload.details = this.details
    return payload
  }
}

export function isCliError(value: unknown): value is CliError {
  return value instanceof CliError || (value as any)?.name === 'CliError'
}

/** One open connection as reported by the `connections` command. */
export interface CliConnectionSummary {
  /** Stable for the lifetime of the window that owns the connection. */
  id: string
  name: string
  connectionType: string
  host: string | null
  database: string | null
  readOnlyMode: boolean
  cliEnabled: boolean
}

/** The `{ id, name }` pair every result carries so the caller knows which connection answered. */
export type CliConnectionRef = Pick<CliConnectionSummary, 'id' | 'name'>

export interface CliEntity {
  schema: string | null
  name: string
  entityType: CliEntityType
  /** Routines only: function, procedure, ... */
  routineType?: string
  returnType?: string
}

export interface CliColumn {
  name: string
  dataType: string
  nullable?: boolean
  defaultValue?: string | null
  primaryKey?: boolean
  comment?: string
  ordinalPosition?: number
  generated?: boolean
  array?: boolean
  enumValues?: string[]
}

export interface CliQueryResult {
  command: string | null
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  totalRowCount: number
  truncated: boolean
  /** The row cap that applied, so a truncated result is self-explanatory. */
  maxRows: number
  affectedRows: number | null
}
