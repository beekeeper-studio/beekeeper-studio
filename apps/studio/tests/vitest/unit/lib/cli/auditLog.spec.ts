import { describe, it, expect, vi } from 'vitest'
import { CLI_AUDIT_SQL_MAX_CHARS, CliAuditLog, buildAuditEntry, createElectronLogSink, summarizeResult } from '@/lib/cli/auditLog'
import { CLI_PROTOCOL_VERSION, CliRequest, CliResponse } from '@/cli/protocol'

function request(command: CliRequest['command'], args: CliRequest['args'] = {}): CliRequest {
  return { version: CLI_PROTOCOL_VERSION, command, args }
}

const now = new Date('2026-10-30T12:00:00.000Z')

describe('buildAuditEntry', () => {
  it('records a successful query with a summary instead of the rows', () => {
    const response: CliResponse = {
      ok: true,
      result: {
        connection: { id: 'sid-1', name: 'Local Dev' },
        results: [
          { command: 'SELECT', columns: ['id'], rows: [{ id: 1 }, { id: 2 }], rowCount: 2, totalRowCount: 20005, truncated: true, maxRows: 20000, affectedRows: 0 },
          { command: 'SELECT', columns: ['n'], rows: [{ n: 1 }], rowCount: 1, totalRowCount: 1, truncated: false, maxRows: 20000, affectedRows: 0 },
        ],
      },
    }
    const entry = buildAuditEntry(
      { request: request('query', { sql: 'select id from users; select 1 as n', connection: 'Local Dev' }), response, durationMs: 12.6, responseBytes: 345 },
      now
    )
    expect(entry).toEqual({
      time: '2026-10-30T12:00:00.000Z',
      command: 'query',
      args: { sql: 'select id from users; select 1 as n', connection: 'Local Dev' },
      connection: { id: 'sid-1', name: 'Local Dev' },
      ok: true,
      durationMs: 13,
      responseBytes: 345,
      result: { statements: 2, commands: ['SELECT', 'SELECT'], rows: 3, totalRows: 20006, truncated: true, affectedRows: 0 },
    })
    expect(JSON.stringify(entry)).not.toContain('"rows":[')
  })

  it('records errors with their code', () => {
    const response: CliResponse = {
      ok: false,
      error: { code: 'CLI_DISABLED', message: 'CLI access is not enabled for the open connection "Prod".', hint: 'Check the box.' },
    }
    const entry = buildAuditEntry({ request: request('list-tables', { schema: 'public' }), response, durationMs: 3, responseBytes: 200 }, now)
    expect(entry.ok).toBe(false)
    expect(entry.connection).toBeNull()
    expect(entry.error).toEqual({ code: 'CLI_DISABLED', message: 'CLI access is not enabled for the open connection "Prod".' })
    expect(entry.result).toBeUndefined()
    expect(entry.args).toEqual({ schema: 'public' })
  })

  it('keeps the connection of a failed query', () => {
    const response: CliResponse = {
      ok: false,
      error: { code: 'READ_ONLY', message: 'The statement was rejected because the CLI is read only.', details: { connection: { id: 'sid-1', name: 'Local Dev' } } },
    }
    const entry = buildAuditEntry({ request: request('query', { sql: 'delete from users' }), response, durationMs: 1, responseBytes: 100 }, now)
    expect(entry.connection).toEqual({ id: 'sid-1', name: 'Local Dev' })
    expect(entry.error.code).toBe('READ_ONLY')
  })

  it('handles requests that could not be parsed', () => {
    const response: CliResponse = { ok: false, error: { code: 'USAGE', message: 'Malformed CLI request: expected one JSON object per line.' } }
    const entry = buildAuditEntry({ request: null, response, durationMs: 0, responseBytes: 90 }, now)
    expect(entry.command).toBeNull()
    expect(entry.args).toBeNull()
    expect(entry.error.code).toBe('USAGE')
  })

  it('cuts very long sql but keeps its length', () => {
    const sql = 'select ' + 'x'.repeat(CLI_AUDIT_SQL_MAX_CHARS * 2)
    const entry = buildAuditEntry(
      { request: request('query', { sql }), response: { ok: true, result: { connection: { id: 's', name: 'n' }, results: [] } }, durationMs: 1, responseBytes: 10 },
      now
    )
    expect((entry.args.sql as string).length).toBe(CLI_AUDIT_SQL_MAX_CHARS)
    expect(entry.args.sqlLength).toBe(sql.length)
    expect(entry.args.sqlTruncated).toBe(true)
  })
})

describe('summarizeResult', () => {
  it('summarizes each command', () => {
    expect(summarizeResult('connections', { connections: [{ cliEnabled: true }, { cliEnabled: false }] })).toEqual({ connections: 2, cliEnabled: 1 })
    expect(summarizeResult('list-schemas', { schemas: ['a', 'b'] })).toEqual({ schemas: 2 })
    expect(summarizeResult('list-entities', { schema: 'public', entityTypes: ['table'], entities: [{}, {}, {}], warnings: ['w'] })).toEqual({
      schema: 'public',
      entityTypes: ['table'],
      entities: 3,
      warnings: 1,
    })
    expect(summarizeResult('structure', { schema: null, name: 'users', entityType: 'table', columns: [{}, {}], warnings: [] })).toEqual({
      schema: null,
      name: 'users',
      entityType: 'table',
      columns: 2,
      warnings: 0,
    })
    expect(summarizeResult('query', { results: [] })).toEqual({ statements: 0, commands: [], rows: 0, totalRows: 0, truncated: false, affectedRows: null })
    expect(summarizeResult('nope', { anything: true })).toEqual({})
    expect(summarizeResult('query', null)).toEqual({})
  })
})

describe('CliAuditLog', () => {
  it('writes one json line per request and redacts sensitive keys', () => {
    const lines: string[] = []
    const log = new CliAuditLog({ write: (line) => lines.push(line) })
    const entry = log.record({
      request: request('query', { sql: 'select 1', password: 'hunter2' } as any),
      response: { ok: true, result: { connection: { id: 's', name: 'Dev' }, results: [] } },
      durationMs: 2,
      responseBytes: 50,
    })
    expect(entry.command).toBe('query')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed.command).toBe('query')
    expect(parsed.args.sql).toBe('select 1')
    expect(parsed.args.password).toBe('[REDACTED]')
    expect(lines[0]).not.toContain('\n')
  })

  it('reports sink failures without throwing', () => {
    const onError = vi.fn()
    const log = new CliAuditLog({ write: () => { throw new Error('disk full') } }, onError)
    const entry = log.record({ request: request('connections'), response: { ok: true, result: { connections: [] } }, durationMs: 1, responseBytes: 20 })
    expect(entry).toBeNull()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk full' }))
  })
})

describe('createElectronLogSink', () => {
  it('configures a dedicated file transport and routes writes to it', () => {
    const info = vi.fn()
    const file: any = { level: 'silly', fileName: 'main.log', format: '{h} {text}', maxSize: 1, getFile: () => ({ path: '/logs/cli.log' }) }
    const console: any = { level: 'silly' }
    const create = vi.fn(() => ({ transports: { console, file }, info }))
    const sink = createElectronLogSink({ create })

    expect(create).toHaveBeenCalledWith({ logId: 'bks-cli' })
    expect(console.level).toBe(false)
    expect(file.level).toBe('info')
    expect(file.fileName).toBe('cli.log')
    expect(file.format).toBe('{text}')
    expect(file.maxSize).toBeGreaterThan(1024 * 1024)
    expect(sink.filePath()).toBe('/logs/cli.log')

    sink.write('{"ok":true}')
    expect(info).toHaveBeenCalledWith('{"ok":true}')
  })
})
