import { describe, it, expect, vi } from 'vitest'
import { CLI_AUDIT_SQL_MAX_CHARS, CliAuditLog, buildAuditEntry, createElectronLogSink, summarizeResult } from '@/services/cliServer/auditLog'
import { Request, Reply } from '@beekeeperstudio/cli'

function request(name: Request['name'], args: Request['args'] = {}): Request {
  return { name, args }
}

const now = new Date('2026-10-30T12:00:00.000Z')

describe('buildAuditEntry', () => {
  it('records a successful query with a summary instead of the rows', () => {
    const response: Reply = {
      id: null,
      type: 'reply',
      data: {
        results: [
          { command: 'SELECT', columns: ['id'], rows: [{ id: 1 }, { id: 2 }], rowCount: 2, totalRowCount: 20005, truncated: true, maxRows: 20000, affectedRows: 0 },
          { command: 'SELECT', columns: ['n'], rows: [{ n: 1 }], rowCount: 1, totalRowCount: 1, truncated: false, maxRows: 20000, affectedRows: 0 },
        ],
      },
    }
    const entry = buildAuditEntry(
      { request: request('runQuery', { sql: 'select id from users; select 1 as n', connection: 'Local Dev' }), response, durationMs: 12.6, responseBytes: 345 },
      now
    )
    expect(entry).toEqual({
      time: '2026-10-30T12:00:00.000Z',
      method: 'runQuery',
      client: 'Unknown client',
      params: { sql: 'select id from users; select 1 as n', connection: 'Local Dev' },
      ok: true,
      durationMs: 13,
      responseBytes: 345,
      result: { statements: 2, commands: ['SELECT', 'SELECT'], rows: 3, totalRows: 20006, truncated: true, affectedRows: 0 },
    })
    expect(JSON.stringify(entry)).not.toContain('"rows":[')
  })

  it('records a successful entities with a summary instead of the entities', () => {
    const response: Reply = {
      id: null,
      type: 'reply',
      data: {
        schema: 'public',
        entities: [
          { schema: 'public', name: 'customers', entityType: 'table' },
          { schema: 'public', name: 'invoices', entityType: 'table' },
          { schema: 'public', name: 'payroll', entityType: 'table' },
        ],
        warnings: [],
      },
    }
    const entry = buildAuditEntry(
      { request: request('getEntities', { schema: 'public', entityTypes: ['table'] }), response, durationMs: 4, responseBytes: 300 },
      now
    )
    expect(entry.result).toEqual({ schema: 'public', entities: 3, warnings: 0 })
    const line = JSON.stringify(entry)
    for (const name of ['customers', 'invoices', 'payroll']) {
      expect(line).not.toContain(name)
    }
  })

  it('records errors with their code', () => {
    const response: Reply = {
      id: null,
      type: 'error',
      error: 'Access to "Prod" was denied for Claude Code.',
      errorCode: 'ACCESS_DENIED',
      errorHint: 'Run the command again to ask again.',
    }
    const entry = buildAuditEntry({ request: request('getEntities', { schema: 'public' }), response, durationMs: 3, responseBytes: 200 }, now)
    expect(entry.ok).toBe(false)
    expect(entry.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access to "Prod" was denied for Claude Code.' })
    expect(entry.result).toBeUndefined()
    expect(entry.params).toEqual({ schema: 'public' })
  })

  it('handles requests that could not be parsed', () => {
    const response: Reply = { id: null, type: 'error', error: 'Malformed CLI request: expected one JSON object per line.', errorCode: 'USAGE' }
    const entry = buildAuditEntry({ request: null, response, durationMs: 0, responseBytes: 90 }, now)
    expect(entry.method).toBeNull()
    expect(entry.params).toBeNull()
    expect(entry.error.code).toBe('USAGE')
  })

  it('cuts very long sql but keeps its length', () => {
    const sql = 'select ' + 'x'.repeat(CLI_AUDIT_SQL_MAX_CHARS * 2)
    const entry = buildAuditEntry(
      { request: request('runQuery', { sql }), response: { id: null, type: 'reply', data: { connection: { id: 's', name: 'n' }, results: [] } }, durationMs: 1, responseBytes: 10 },
      now
    )
    expect((entry.params.sql as string).length).toBe(CLI_AUDIT_SQL_MAX_CHARS)
    expect(entry.params.sqlLength).toBe(sql.length)
    expect(entry.params.sqlTruncated).toBe(true)
  })
})

describe('summarizeResult', () => {
  it('summarizes each method', () => {
    expect(summarizeResult('getConnections', { connections: [{ approved: true }, { approved: false }] })).toEqual({ connections: 2, approved: 1 })
    expect(summarizeResult('getSchemas', { schemas: ['a', 'b'] })).toEqual({ schemas: 2 })
    expect(summarizeResult('getEntities', { schema: 'public', entities: [{}, {}, {}], warnings: ['w'] })).toEqual({
      schema: 'public',
      entities: 3,
      warnings: 1,
    })
    expect(summarizeResult('getTableStructure', { schema: null, name: 'users', entityType: 'table', columns: [{}, {}], warnings: [] })).toEqual({
      schema: null,
      name: 'users',
      entityType: 'table',
      columns: 2,
      warnings: 0,
    })
    expect(summarizeResult('runQuery', { results: [] })).toEqual({ statements: 0, commands: [], rows: 0, totalRows: 0, truncated: false, affectedRows: null })
    expect(summarizeResult('nope', { anything: true })).toEqual({})
    expect(summarizeResult('runQuery', null)).toEqual({})
  })
})

describe('CliAuditLog', () => {
  it('writes one json line per request and redacts sensitive keys', () => {
    const lines: string[] = []
    const log = new CliAuditLog({ write: (line) => lines.push(line) })
    const entry = log.record({
      request: request('runQuery', { sql: 'select 1', password: 'hunter2' } as any),
      response: { id: null, type: 'reply', data: { connection: { id: 's', name: 'Dev' }, results: [] } },
      durationMs: 2,
      responseBytes: 50,
    })
    expect(entry.method).toBe('runQuery')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed.method).toBe('runQuery')
    expect(parsed.params.sql).toBe('select 1')
    expect(parsed.params.password).toBe('[REDACTED]')
    expect(lines[0]).not.toContain('\n')
  })

  it('reports sink failures without throwing', () => {
    const onError = vi.fn()
    const log = new CliAuditLog({ write: () => { throw new Error('disk full') } }, onError)
    const entry = log.record({ request: request('getConnections'), response: { id: null, type: 'reply', data: { connections: [] } }, durationMs: 1, responseBytes: 20 })
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
