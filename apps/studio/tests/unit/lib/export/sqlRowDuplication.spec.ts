/**
 * Regression tests for a customer report:
 *
 *   "When I export row/s as SQL, in the result INSERT there is duplication
 *    of the last or first row from the export — even if I export 1 row."
 *
 * SQL INSERTs are produced from rows in exactly two user-facing places:
 *
 *  1. Export to file (Export → SQL format, tables only — the format is
 *     disabled for query exports in ExportModal.vue). That pipeline is
 *     selectTopStream → BeeCursor chunked reads → Export.exportData() →
 *     SqlExporter.formatRow() (knex).
 *  2. The results-grid "Copy as SQL" action, whose backend is
 *     getInsertQuery → buildInsertQuery (knex).
 *
 * These tests drive both with the real machinery — a real SQLite database
 * file (better-sqlite3), the real SqliteCursor used by
 * SqliteClient.selectTopStream, the real Export.exportToFile() loop and the
 * real knex SQL generation — and assert that every source row appears
 * exactly once in the generated SQL. They are written to FAIL if any code
 * path duplicates the first row, the last row, a chunk-boundary row, or
 * emits an extra INSERT for a single-row export.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import Database from 'better-sqlite3'
import knexlib from 'knex'
import { SqlExporter } from '@/lib/export/formats/sql'
import { ExportStatus } from '@/lib/export/models'
import { SqliteCursor } from '@/lib/db/clients/sqlite/SqliteCursor'
import { buildInsertQuery, buildInsertQueries, buildSelectTopQuery } from '@/lib/db/clients/utils'
import type { TableColumn, TableOrView } from '@/lib/db/models'
import type { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'

const TABLE = 'export_rows'
const COLUMNS: TableColumn[] = [
  { columnName: 'id', dataType: 'integer' },
  { columnName: 'marker', dataType: 'text' },
]

function marker(i: number): string {
  return `marker_row_${String(i).padStart(3, '0')}`
}

/** Create a SQLite db file holding `rowCount` uniquely-markered rows. */
function makeDb(dir: string, rowCount: number): string {
  const dbPath = path.join(dir, `source-${rowCount}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`)
  const db = new Database(dbPath)
  db.exec(`CREATE TABLE ${TABLE} (id INTEGER PRIMARY KEY, marker TEXT NOT NULL)`)
  const insert = db.prepare(`INSERT INTO ${TABLE} (id, marker) VALUES (?, ?)`)
  for (let i = 1; i <= rowCount; i++) {
    insert.run(i, marker(i))
  }
  db.close()
  return dbPath
}

/**
 * Minimal stand-in for SqliteClient that streams exactly like the real
 * client: SqliteClient.selectTopStream builds its query with
 * buildSelectTopQuery(table, null, null, orderBy, filters) and hands back a
 * SqliteCursor over the database path (sqlite.ts:506-516). Everything
 * downstream of here — cursor, export loop, SQL generation — is real code.
 */
function connectionStub(dbPath: string, totalRows: number) {
  return {
    connectionType: 'sqlite',
    async selectTopStream(
      table: string,
      orderBy: any[],
      filters: any[],
      chunkSize: number,
      _schema?: string
    ) {
      const { query, params } = buildSelectTopQuery(table, null, null, orderBy, filters)
      return {
        totalRows,
        columns: COLUMNS,
        cursor: new SqliteCursor(dbPath, query, params, chunkSize),
      }
    },
  } as unknown as BasicDatabaseClient<any>
}

interface RunOptions {
  rowCount: number
  chunkSize: number
  preserveColumnOrder?: boolean
}

async function runSqlExport(dir: string, opts: RunOptions): Promise<string> {
  const dbPath = makeDb(dir, opts.rowCount)
  const filePath = path.join(
    dir,
    `out-${opts.rowCount}-${opts.chunkSize}-${opts.preserveColumnOrder ? 'ordered' : 'default'}.sql`
  )
  const exporter = new SqlExporter(
    filePath,
    connectionStub(dbPath, opts.rowCount),
    { name: TABLE } as TableOrView,
    '',
    '',
    [],
    { chunkSize: opts.chunkSize, deleteOnAbort: false, includeFilter: false },
    { createTable: false, schema: false, preserveColumnOrder: opts.preserveColumnOrder === true },
    false
  )
  await exporter.exportToFile()

  // exportToFile swallows errors into exporter.error — surface them so a
  // crash can never masquerade as a passing (or failing) content check.
  expect(exporter.error).toBeNull()
  expect(exporter.status).toBe(ExportStatus.Completed)
  return fs.readFileSync(filePath, 'utf8')
}

/** Split exported file content into individual non-empty statements. */
function statementsIn(content: string): string[] {
  return content
    .split(';\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

function expectEachRowExactlyOnce(content: string, rowCount: number) {
  const stmts = statementsIn(content)

  // One INSERT per row — an extra statement (duplicated first/last row) or a
  // missing one both fail here.
  expect(stmts).toHaveLength(rowCount)
  stmts.forEach((stmt) => {
    expect(stmt.toLowerCase()).toMatch(/^insert into/)
    // A single INSERT must carry a single VALUES tuple — the report describes
    // the row being duplicated inside the resulting INSERT.
    expect(countOccurrences(stmt.toLowerCase(), 'values')).toBe(1)
  })

  // No two identical INSERT statements in the file.
  expect(new Set(stmts).size).toBe(stmts.length)

  // Every source row appears exactly once in the whole file — catches
  // duplication of first, last, and chunk-boundary rows alike.
  for (let i = 1; i <= rowCount; i++) {
    expect(countOccurrences(content, marker(i))).toBe(1)
  }
  // And no marker beyond the source rows was fabricated.
  expect(countOccurrences(content, marker(rowCount + 1))).toBe(0)
}

describe('SQL export row duplication (customer report regression)', () => {
  let dir: string

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bks-sql-export-dup-'))
  })

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  describe('Export to file (selectTopStream → cursor → SqlExporter)', () => {
    it('exports a single row as exactly one INSERT ("even if I export 1 row")', async () => {
      const content = await runSqlExport(dir, { rowCount: 1, chunkSize: 100 })
      expectEachRowExactlyOnce(content, 1)
    })

    it('does not duplicate the row when row count equals chunk size (1 row, chunk 1)', async () => {
      const content = await runSqlExport(dir, { rowCount: 1, chunkSize: 1 })
      expectEachRowExactlyOnce(content, 1)
    })

    it('does not duplicate rows when the data fits one exact chunk (3 rows, chunk 3)', async () => {
      const content = await runSqlExport(dir, { rowCount: 3, chunkSize: 3 })
      expectEachRowExactlyOnce(content, 3)
    })

    it('does not duplicate boundary rows across exact multiple chunks (6 rows, chunk 3)', async () => {
      const content = await runSqlExport(dir, { rowCount: 6, chunkSize: 3 })
      expectEachRowExactlyOnce(content, 6)
    })

    it('does not duplicate boundary rows with a remainder chunk (7 rows, chunk 3)', async () => {
      const content = await runSqlExport(dir, { rowCount: 7, chunkSize: 3 })
      expectEachRowExactlyOnce(content, 7)
    })

    it('does not duplicate rows in a single partial chunk (5 rows, chunk 100)', async () => {
      const content = await runSqlExport(dir, { rowCount: 5, chunkSize: 100 })
      expectEachRowExactlyOnce(content, 5)
    })
  })

  describe('Export to file with "Preserve Column Order" enabled', () => {
    it('exports a single row as exactly one INSERT', async () => {
      const content = await runSqlExport(dir, { rowCount: 1, chunkSize: 100, preserveColumnOrder: true })
      expectEachRowExactlyOnce(content, 1)
    })

    it('does not duplicate boundary rows across chunks (6 rows, chunk 3)', async () => {
      const content = await runSqlExport(dir, { rowCount: 6, chunkSize: 3, preserveColumnOrder: true })
      expectEachRowExactlyOnce(content, 6)
    })
  })

  describe('"Copy as SQL" backend (buildInsertQuery, the getInsertQuery core)', () => {
    const knex = knexlib({ client: 'better-sqlite3' })

    it('a single copied row produces one INSERT with one VALUES tuple', () => {
      const sql = buildInsertQuery(knex, {
        table: TABLE,
        data: [{ id: 1, marker: marker(1) }],
      })

      expect(countOccurrences(sql.toLowerCase(), 'insert into')).toBe(1)
      expect(countOccurrences(sql.toLowerCase(), 'values')).toBe(1)
      expect(countOccurrences(sql, marker(1))).toBe(1)
    })

    it('three copied rows produce one INSERT with each row exactly once (sqlite)', () => {
      const rows = [1, 2, 3].map((i) => ({ id: i, marker: marker(i) }))
      const sql = buildInsertQuery(knex, { table: TABLE, data: rows })

      expect(countOccurrences(sql.toLowerCase(), 'insert into')).toBe(1)
      // knex compiles a sqlite multi-row insert as
      // `insert into ... select ... union all select ...` — one select per
      // row, so exactly two `union all` joints for three rows.
      expect(countOccurrences(sql.toLowerCase(), 'union all select')).toBe(2)
      rows.forEach((row) => {
        expect(countOccurrences(sql, row.marker)).toBe(1)
      })
    })

    it('three copied rows produce one INSERT with three VALUES tuples, each row exactly once (postgres)', () => {
      const pgKnex = knexlib({ client: 'pg' })
      const rows = [1, 2, 3].map((i) => ({ id: i, marker: marker(i) }))
      const sql = buildInsertQuery(pgKnex, { table: TABLE, schema: 'public', data: rows })

      expect(countOccurrences(sql.toLowerCase(), 'insert into')).toBe(1)
      // pg compiles a multi-row insert into a single VALUES clause with one
      // tuple per row: values (...), (...), (...)
      expect(countOccurrences(sql.toLowerCase(), 'values')).toBe(1)
      expect(countOccurrences(sql, '), (')).toBe(2)
      rows.forEach((row) => {
        expect(countOccurrences(sql, row.marker)).toBe(1)
      })
    })

    it('buildInsertQueries emits one statement per insert, none repeated', () => {
      const inserts = [
        { table: TABLE, data: [{ id: 1, marker: marker(1) }] },
        { table: TABLE, data: [{ id: 2, marker: marker(2) }] },
      ]
      const queries = buildInsertQueries(knex, inserts)

      expect(queries).toHaveLength(2)
      expect(new Set(queries).size).toBe(2)
      expect(countOccurrences(queries.join(';'), marker(1))).toBe(1)
      expect(countOccurrences(queries.join(';'), marker(2))).toBe(1)
    })
  })
})
