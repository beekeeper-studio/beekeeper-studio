import { redactMessage } from '@/lib/log/redact'
import { CliRequest, CliResponse } from './protocol'

/** What the socket server reports after answering one request. */
export interface CliRequestEvent {
  /** Null when the request line was not valid JSON. */
  request: CliRequest | null
  response: CliResponse
  durationMs: number
  responseBytes: number
}

export interface CliAuditEntry {
  time: string
  command: string | null
  /** The arguments as received, SQL included (cut at CLI_AUDIT_SQL_MAX_CHARS). */
  args: Record<string, unknown> | null
  /** The connection that answered, when one was selected. */
  connection: { id: string; name: string } | null
  ok: boolean
  durationMs: number
  responseBytes: number
  error?: { code: string; message: string }
  /** Per-command summary of the response. Never the data itself. */
  result?: Record<string, unknown>
}

export const CLI_LOG_FILE_NAME = 'cli.log'
export const CLI_AUDIT_SQL_MAX_CHARS = 10000

function sum(values: unknown[]): number | null {
  const numbers = values.filter((v): v is number => typeof v === 'number')
  return numbers.length ? numbers.reduce((a, b) => a + b, 0) : null
}

export function summarizeResult(command: string | null, result: any): Record<string, unknown> {
  if (!result || typeof result !== 'object') return {}
  switch (command) {
    case 'connections': {
      const connections: any[] = result.connections || []
      return { connections: connections.length, cliEnabled: connections.filter((c) => c?.cliEnabled).length }
    }
    case 'list-schemas':
      return { schemas: (result.schemas || []).length }
    case 'list-tables':
    case 'list-entities':
      return {
        schema: result.schema ?? null,
        entityTypes: result.entityTypes ?? null,
        entities: (result.entities || []).length,
        warnings: (result.warnings || []).length,
      }
    case 'structure':
      return {
        schema: result.schema ?? null,
        name: result.name ?? null,
        entityType: result.entityType ?? null,
        columns: (result.columns || []).length,
        warnings: (result.warnings || []).length,
      }
    case 'query': {
      const results: any[] = result.results || []
      return {
        statements: results.length,
        commands: results.map((r) => r?.command ?? null),
        rows: sum(results.map((r) => r?.rowCount)) ?? 0,
        totalRows: sum(results.map((r) => r?.totalRowCount)) ?? 0,
        truncated: results.some((r) => r?.truncated),
        affectedRows: sum(results.map((r) => r?.affectedRows)),
      }
    }
    default:
      return {}
  }
}

function auditArgs(request: CliRequest | null): Record<string, unknown> | null {
  if (!request?.args || typeof request.args !== 'object') return null
  const args: Record<string, unknown> = { ...request.args }
  if (typeof args.sql === 'string' && args.sql.length > CLI_AUDIT_SQL_MAX_CHARS) {
    args.sqlLength = args.sql.length
    args.sql = args.sql.slice(0, CLI_AUDIT_SQL_MAX_CHARS)
    args.sqlTruncated = true
  }
  return args
}

export function buildAuditEntry(event: CliRequestEvent, now: Date = new Date()): CliAuditEntry {
  const command = typeof event.request?.command === 'string' ? event.request.command : null
  const entry: CliAuditEntry = {
    time: now.toISOString(),
    command,
    args: auditArgs(event.request),
    connection: null,
    ok: !!event.response?.ok,
    durationMs: Math.max(0, Math.round(event.durationMs)),
    responseBytes: event.responseBytes,
  }
  if (event.response?.ok) {
    const result: any = event.response.result
    if (result?.connection?.id) {
      entry.connection = { id: String(result.connection.id), name: String(result.connection.name ?? '') }
    }
    entry.result = summarizeResult(command, result)
  } else if (event.response) {
    const error = event.response.error
    entry.error = { code: error?.code ?? 'INTERNAL', message: String(error?.message ?? '') }
    const connection = (error?.details as any)?.connection
    if (connection?.id) {
      entry.connection = { id: String(connection.id), name: String(connection.name ?? '') }
    }
  }
  return entry
}

export interface CliAuditSink {
  write(line: string): void
}

/** Writes one JSON line per CLI request. Never throws into the server. */
export class CliAuditLog {
  constructor(
    private readonly sink: CliAuditSink,
    private readonly onError: (error: unknown) => void = () => undefined
  ) {}

  record(event: CliRequestEvent): CliAuditEntry | null {
    try {
      const entry = buildAuditEntry(event)
      // Same redaction as the other log files, in case a value with a
      // sensitive looking key ever ends up in the arguments.
      const [redacted] = redactMessage({ data: [entry] } as any).data
      this.sink.write(JSON.stringify(redacted))
      return entry
    } catch (error) {
      this.onError(error)
      return null
    }
  }
}

interface ElectronLogLike {
  create(options: { logId: string }): any
}

export interface ElectronLogSink extends CliAuditSink {
  /** Where the entries go, once the first one is written. */
  filePath(): string | null
}

/**
 * A separate electron-log instance so the entries land in their own file,
 * next to main.log and utility.log, with the usual rotation.
 */
export function createElectronLogSink(rawLog: ElectronLogLike): ElectronLogSink {
  const logger = rawLog.create({ logId: 'bks-cli' })
  for (const [name, transport] of Object.entries<any>(logger.transports || {})) {
    if (transport && name !== 'file') transport.level = false
  }
  const file = logger.transports.file
  file.level = 'info'
  file.fileName = CLI_LOG_FILE_NAME
  file.format = '{text}'
  file.maxSize = 10 * 1024 * 1024
  return {
    write(line: string) {
      logger.info(line)
    },
    filePath() {
      try {
        return file.getFile()?.path ?? null
      } catch {
        return null
      }
    },
  }
}
