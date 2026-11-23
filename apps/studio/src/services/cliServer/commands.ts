import _ from 'lodash'
import { IConnection } from '@/common/interfaces/IConnection'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import {
  DatabaseEntity,
  ExtendedTableColumn,
  NgQueryResult,
  TableColumn,
} from '@/lib/db/models'
import {
  CLI_MAX_QUERY_ROWS,
  CliBinaryValue,
  CliColumn,
  CliConnectionRef,
  CliConnectionSummary,
  CliEntity,
  CliEntityType,
  CliQueryResult,
} from '@beekeeperstudio/cli-client'

/** A live connection the app holds, as the CLI sees it. One per connected renderer. */
export interface CliOpenConnection {
  id: string
  /** The config the renderer connected with. Null for a connection restored without one. */
  config: IConnection | null
  database: string | null
  client: BasicDatabaseClient<any, any>
}

export const ENABLE_CLI_HINT =
  'To enable it, edit the connection in Beekeeper Studio, check "Enable CLI Access", save, ' +
  'and connect again. To enable it for every connection instead, add these two lines to ' +
  'user.config.ini and restart Beekeeper Studio:\n[cli]\nenableForAllConnections = true'

const FILE_BASED_TYPES = ['sqlite', 'duckdb', 'libsql']

export const READ_ONLY_HINT =
  'The CLI is read only. It runs statements that read data (SELECT, SHOW, EXPLAIN, DESCRIBE and ' +
  'the like) on any connection; run writes in the Beekeeper Studio app.'

export function connectionDisplayName(connection: CliOpenConnection): string {
  const config = connection.config
  if (config?.name) return config.name
  const type = config?.connectionType || connection.client?.connectionType || 'database'
  const database = connection.database || config?.defaultDatabase
  // The host is a placeholder for file based databases; the path says it all.
  const location = FILE_BASED_TYPES.includes(type)
    ? database
    : [config?.host, database].filter(Boolean).join('/')
  return location ? `${type} ${location}` : `${type} ${connection.id.slice(0, 8)}`
}

export function ref(summary: CliConnectionSummary): CliConnectionRef {
  return { id: summary.id, name: summary.name }
}

export interface Candidate {
  connection: CliOpenConnection
  summary: CliConnectionSummary
}

export function quotedNames(items: Candidate[]): string {
  return items.map((item) => `"${item.summary.name}"`).join(', ')
}

/** Runs `fn`, turning a failure into a warning instead of failing the whole command. */
export async function attempt<T>(label: string, warnings: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    warnings.push(`${label}: ${error?.message ?? error}`)
    return null
  }
}

export function toEntity(entity: DatabaseEntity, entityType: CliEntityType): CliEntity {
  return { schema: entity.schema ?? null, name: entity.name, entityType }
}

export function toColumn(column: ExtendedTableColumn | TableColumn): CliColumn {
  const extended = column as Partial<ExtendedTableColumn>
  return _.omitBy(
    {
      name: column.columnName,
      dataType: column.dataType,
      nullable: extended.nullable,
      defaultValue: extended.defaultValue,
      primaryKey: extended.primaryKey,
      comment: extended.comment,
      ordinalPosition: extended.ordinalPosition,
      generated: extended.generated,
      array: extended.array,
      enumValues: extended.enumValues,
    },
    _.isUndefined
  ) as CliColumn
}

/** Column names, made unique so a result with two `id` columns loses nothing. */
export function uniqueColumnNames(names: string[]): string[] {
  const counts = new Map<string, number>()
  return names.map((rawName) => {
    const name = rawName ?? ''
    const count = counts.get(name) ?? 0
    counts.set(name, count + 1)
    return count === 0 ? name : `${name}_${count + 1}`
  })
}

/** Binary cells as hex; JSON would otherwise write a Buffer as an array of bytes. */
function cellValue(value: unknown): unknown {
  if (value instanceof ArrayBuffer) {
    return { type: 'binary', encoding: 'hex', data: Buffer.from(value).toString('hex') } satisfies CliBinaryValue
  }
  if (ArrayBuffer.isView(value)) {
    const buffer = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
    return { type: 'binary', encoding: 'hex', data: buffer.toString('hex') } satisfies CliBinaryValue
  }
  return value
}

export function formatQueryResult(result: NgQueryResult): CliQueryResult {
  const rows = result.rows || []
  const fields =
    result.fields && result.fields.length > 0
      ? result.fields
      : Object.keys(rows[0] || {}).map((name) => ({ id: name, name }))
  const columns = uniqueColumnNames(fields.map((field) => field.name ?? field.id))

  const limited = rows.slice(0, CLI_MAX_QUERY_ROWS)
  const mapped = limited.map((row) => {
    const out: Record<string, unknown> = {}
    fields.forEach((field, index) => {
      out[columns[index]] = cellValue(Array.isArray(row) ? row[index] : row[field.id])
    })
    return out
  })

  const clientTruncated = !!result.truncated
  return {
    command: result.command ?? null,
    columns,
    rows: mapped,
    rowCount: mapped.length,
    totalRowCount: clientTruncated ? result.totalRowCount ?? rows.length : rows.length,
    truncated: clientTruncated || rows.length > CLI_MAX_QUERY_ROWS,
    maxRows: CLI_MAX_QUERY_ROWS,
    affectedRows: result.affectedRows ?? null,
  }
}
