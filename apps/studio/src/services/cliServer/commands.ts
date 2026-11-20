import _ from 'lodash'
import { IConnection } from '@/common/interfaces/IConnection'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { errorMessages as clientErrorMessages } from '@/lib/db/clients/utils'
import {
  DatabaseEntity,
  ExtendedTableColumn,
  NgQueryResult,
  TableColumn,
  TableProperties,
} from '@/lib/db/models'
import {
  CLI_ENTITY_TYPES,
  CLI_MAX_QUERY_ROWS,
  CLI_TAB_TYPES,
  CliBinaryValue,
  CliColumn,
  CliConnectionRef,
  CliConnectionSummary,
  CliEntity,
  CliEntityType,
  CliError,
  CliMethods,
  CliCreateTabRequest,
  CliQueryResult,
  CliTabSummary,
  isCliError,
} from '@/cli/protocol'

/** A live connection the app holds, as the CLI sees it. One per connected window. */
export interface CliOpenConnection {
  id: string
  /** The config the window connected with. Null for a connection restored without one. */
  config: IConnection | null
  database: string | null
  client: BasicDatabaseClient<any, any>
}

/**
 * What the command implementations need from the process that owns the
 * connections. The utility process provides the real one; tests provide fakes.
 */
export interface CliBackend {
  openConnections(): CliOpenConnection[]
  isCliEnabled(connection: CliOpenConnection): Promise<boolean>
  /** Asks the window that owns the connection to open a tab, or switch to an equal one it has. */
  createTab(connection: CliOpenConnection, request: CliCreateTabRequest): Promise<CliTabSummary>
  /** Asks the window that owns the connection to switch to one of its tabs. */
  switchTab(connection: CliOpenConnection, tabId: string): Promise<CliTabSummary>
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

function summarize(connection: CliOpenConnection, cliEnabled: boolean): CliConnectionSummary {
  const config = connection.config
  return {
    id: connection.id,
    name: connectionDisplayName(connection),
    connectionType: config?.connectionType || connection.client?.connectionType || null,
    host: config?.host ?? null,
    database: connection.database || config?.defaultDatabase || null,
    readOnlyMode: !!config?.readOnlyMode,
    cliEnabled,
  }
}

function ref(summary: CliConnectionSummary): CliConnectionRef {
  return { id: summary.id, name: summary.name }
}

interface Candidate {
  connection: CliOpenConnection
  summary: CliConnectionSummary
}

async function candidates(backend: CliBackend): Promise<Candidate[]> {
  const open = backend.openConnections()
  return Promise.all(
    open.map(async (connection) => ({
      connection,
      summary: summarize(connection, await backend.isCliEnabled(connection)),
    }))
  )
}

function quotedNames(items: Candidate[]): string {
  return items.map((item) => `"${item.summary.name}"`).join(', ')
}

async function selectConnection(backend: CliBackend, requested?: string): Promise<Candidate> {
  const all = await candidates(backend)
  const details = { connections: all.map((item) => item.summary) }

  if (all.length === 0) {
    throw new CliError('NO_OPEN_CONNECTIONS', 'No database connection is open in Beekeeper Studio.', {
      hint: 'Connect to a database in the Beekeeper Studio app, then run the command again.',
    })
  }

  if (requested) {
    const needle = requested.trim().toLowerCase()
    const matches = all.filter(
      (item) => item.summary.id === requested.trim() || item.summary.name.toLowerCase() === needle
    )
    if (matches.length === 0) {
      throw new CliError('UNKNOWN_CONNECTION', `No open connection is named "${requested}".`, {
        hint: `Open connections: ${quotedNames(all)}. Run \`connections\` to list them with their ids.`,
        details,
      })
    }
    if (matches.length > 1) {
      throw new CliError(
        'AMBIGUOUS_CONNECTION',
        `${matches.length} open connections are named "${requested}".`,
        { hint: 'Pass --connection <id> instead. Run `connections` to see the ids.', details }
      )
    }
    const match = matches[0]
    if (!match.summary.cliEnabled) {
      throw new CliError('CLI_DISABLED', `CLI access is not enabled for the connection "${match.summary.name}".`, {
        hint: ENABLE_CLI_HINT,
        details,
      })
    }
    return match
  }

  const enabled = all.filter((item) => item.summary.cliEnabled)
  if (enabled.length === 0) {
    const message =
      all.length === 1
        ? `CLI access is not enabled for the open connection "${all[0].summary.name}".`
        : `CLI access is not enabled for any of the ${all.length} open connections (${quotedNames(all)}).`
    throw new CliError('CLI_DISABLED', message, { hint: ENABLE_CLI_HINT, details })
  }
  if (enabled.length > 1) {
    throw new CliError(
      'AMBIGUOUS_CONNECTION',
      `${enabled.length} open connections have CLI access enabled: ${quotedNames(enabled)}.`,
      { hint: 'Pass --connection <name> to pick one.', details }
    )
  }
  return enabled[0]
}

/** Runs `fn`, turning a failure into a warning instead of failing the whole command. */
async function attempt<T>(label: string, warnings: string[], fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    warnings.push(`${label}: ${error?.message ?? error}`)
    return null
  }
}

function toEntity(entity: DatabaseEntity, entityType: CliEntityType): CliEntity {
  return { schema: entity.schema ?? null, name: entity.name, entityType }
}

async function loadEntities(
  client: BasicDatabaseClient<any, any>,
  schema: string | undefined,
  types: CliEntityType[],
  warnings: string[]
): Promise<CliEntity[]> {
  const filter = { schema: schema ?? null }
  const loaders: Record<CliEntityType, () => Promise<CliEntity[]>> = {
    table: async () => (await client.listTables(filter)).map((t) => toEntity(t, 'table')),
    view: async () => (await client.listViews(filter)).map((v) => toEntity(v, 'view')),
    'materialized-view': async () =>
      (await client.listMaterializedViews(filter)).map((v) => toEntity(v, 'materialized-view')),
    routine: async () =>
      (await client.listRoutines(filter)).map((r) => ({
        ...toEntity(r, 'routine'),
        routineType: r.type,
        returnType: r.returnType,
      })),
  }

  const entities: CliEntity[] = []
  for (const type of types) {
    const result = await attempt(`Could not list ${type}s`, warnings, loaders[type])
    if (result) entities.push(...result)
  }
  // Not every client honours filter.schema, so filter here as well. Entities
  // without a schema (sqlite, mysql) are kept.
  return schema ? entities.filter((e) => !e.schema || e.schema === schema) : entities
}

function toColumn(column: ExtendedTableColumn | TableColumn): CliColumn {
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

async function findEntity(
  client: BasicDatabaseClient<any, any>,
  name: string,
  schema: string | undefined
): Promise<{ entity: CliEntity; warnings: string[] }> {
  const warnings: string[] = []
  const all = await loadEntities(client, schema, ['table', 'view', 'materialized-view'], warnings)

  let matches = all.filter((e) => e.name === name)
  if (matches.length === 0) {
    const lowered = name.toLowerCase()
    matches = all.filter((e) => e.name.toLowerCase() === lowered)
  }
  if (matches.length === 0) {
    const where = schema ? ` in schema "${schema}"` : ''
    throw new CliError('NOT_FOUND', `No table or view named "${name}"${where}.`, {
      hint: 'Run `entities` to see the available names.',
    })
  }
  if (matches.length > 1) {
    const schemas = _.uniq(matches.map((e) => e.schema || '(none)'))
    throw new CliError(
      'AMBIGUOUS_ENTITY',
      `"${name}" exists in more than one schema: ${schemas.join(', ')}.`,
      { hint: 'Pass --schema <schema> to pick one.' }
    )
  }

  return { entity: matches[0], warnings }
}

async function describeEntity(
  client: BasicDatabaseClient<any, any>,
  name: string,
  schema: string | undefined
) {
  const { entity, warnings } = await findEntity(client, name, schema)
  const target = entity.schema ?? undefined

  const rawColumns =
    (await attempt('Could not list columns', warnings, () =>
      entity.entityType === 'materialized-view'
        ? client.listMaterializedViewColumns(entity.name, target)
        : client.listTableColumns(entity.name, target)
    )) || []
  const columns = rawColumns.map(toColumn)

  let primaryKeys: string[] = []
  let properties: TableProperties | null = null
  if (entity.entityType === 'table') {
    const keys = await attempt('Could not read primary keys', warnings, () =>
      client.getPrimaryKeys(entity.name, target)
    )
    primaryKeys = _.sortBy(keys || [], 'position').map((key) => key.columnName)
    properties = await attempt('Could not read table properties', warnings, () =>
      client.getTableProperties(entity.name, target)
    )
  }
  if (primaryKeys.length > 0) {
    for (const column of columns) {
      column.primaryKey = primaryKeys.includes(column.name)
    }
  }

  const createScript = await attempt('Could not read the create script', warnings, async () => {
    if (entity.entityType === 'table') return client.getTableCreateScript(entity.name, target)
    const lines =
      entity.entityType === 'view'
        ? await client.getViewCreateScript(entity.name, target)
        : await client.getMaterializedViewCreateScript(entity.name, target)
    return (lines || []).join('\n')
  })

  return {
    schema: entity.schema,
    name: entity.name,
    entityType: entity.entityType,
    description: properties?.description ?? null,
    columns,
    primaryKeys,
    indexes: properties?.indexes ?? [],
    relations: properties?.relations ?? [],
    triggers: properties?.triggers ?? [],
    partitions: properties?.partitions ?? [],
    size: properties?.size ?? null,
    indexSize: properties?.indexSize ?? null,
    owner: properties?.owner ?? null,
    createdAt: properties?.createdAt ?? null,
    createScript: createScript || null,
    warnings,
  }
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

async function runQuery(client: BasicDatabaseClient<any, any>, sql: string | undefined) {
  if (!sql || !sql.trim()) {
    throw new CliError('USAGE', 'No SQL was given to run.')
  }
  let results: NgQueryResult[]
  try {
    // forceReadOnly is the same switch the plugin sandbox uses: the client
    // rejects anything but reads, whatever the connection's own mode is.
    // arrayMode (postgres, sqlite) and rowsAsArray (mysql) keep duplicate
    // column names apart; clients that don't know the options ignore them.
    results = await client.executeQuery(sql, { forceReadOnly: true, arrayMode: true, rowsAsArray: true })
  } catch (error) {
    const message: string = error?.message ?? String(error)
    if (message === clientErrorMessages.readOnly) {
      throw new CliError('READ_ONLY', 'The statement was rejected because the CLI is read only.', {
        hint: READ_ONLY_HINT,
      })
    }
    throw new CliError('QUERY_FAILED', message, {
      details: _.omitBy(
        { code: error?.code, detail: error?.detail, hint: error?.hint, position: error?.position },
        _.isNil
      ),
    })
  }
  return (results || []).map(formatQueryResult)
}

function validateEntityTypes(types: string[] | undefined) {
  for (const type of types || []) {
    if (!(CLI_ENTITY_TYPES as readonly string[]).includes(type)) {
      throw new CliError('USAGE', `Unknown entity type "${type}".`, {
        hint: `Entity types: ${CLI_ENTITY_TYPES.join(', ')}.`,
      })
    }
  }
}

async function onConnection<T>(
  backend: CliBackend,
  params: { connection?: string },
  run: (client: BasicDatabaseClient<any, any>, connection: CliConnectionRef, open: CliOpenConnection) => Promise<T>
): Promise<T> {
  const selected = await selectConnection(backend, params.connection)
  const connection = ref(selected.summary)
  try {
    return await run(selected.connection.client, connection, selected.connection)
  } catch (error) {
    // The audit log wants to know which connection a failed call ran against.
    if (isCliError(error)) {
      error.details = { ...((error.details as Record<string, unknown>) || {}), connection }
    }
    throw error
  }
}

export function createCliMethods(backend: CliBackend): CliMethods {
  return {
    async connections() {
      const all = await candidates(backend)
      return { connections: all.map((item) => item.summary) }
    },
    async schemas(params) {
      return onConnection(backend, params, async (client, connection) => {
        const schemas = await client.listSchemas()
        return { connection, schemas: schemas || [] }
      })
    },
    async entities(params) {
      validateEntityTypes(params.entityTypes)
      return onConnection(backend, params, async (client, connection) => {
        const warnings: string[] = []
        const types = params.entityTypes || [...CLI_ENTITY_TYPES]
        const entities = await loadEntities(client, params.schema, types, warnings)
        return { connection, schema: params.schema ?? null, entityTypes: types, entities, warnings }
      })
    },
    async structure(params) {
      return onConnection(backend, params, async (client, connection) => {
        if (!params.name) {
          throw new CliError('USAGE', 'structure needs the name of a table or view.')
        }
        const entity = await describeEntity(client, params.name, params.schema)
        return { connection, ...entity }
      })
    },
    async query(params) {
      return onConnection(backend, params, async (client, connection) => {
        const results = await runQuery(client, params.sql)
        return { connection, results }
      })
    },
    async createTab(params) {
      const tab = params.tab
      if (!(CLI_TAB_TYPES as readonly string[]).includes(tab)) {
        throw new CliError('USAGE', `Unknown tab type "${tab}".`, {
          hint: `Tab types: ${CLI_TAB_TYPES.join(', ')}.`,
        })
      }
      return onConnection(backend, params, async (_client, connection, open) => {
        const request: CliCreateTabRequest = { tab, sql: params.sql }
        const summary = await backend.createTab(open, request)
        return { connection, ...request, ...summary }
      })
    },
    async switchTab(params) {
      if (!params.tabId) {
        throw new CliError('USAGE', 'switch-tab needs the id of a tab.')
      }
      return onConnection(backend, params, async (_client, connection, open) => {
        const summary = await backend.switchTab(open, String(params.tabId))
        return { connection, ...summary }
      })
    },
  }
}
