import { BksConfig } from '@/common/bksConfig/BksConfigProvider'
import { SavedConnection } from '@/common/appdb/models/saved_connection'
import { IConnection } from '@/common/interfaces/IConnection'
import { LocalWorkspace } from '@/common/interfaces/IWorkspace'
import { allStates, state } from '@/handlers/handlerState'
import _ from 'lodash'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { errorMessages as clientErrorMessages } from '@/lib/db/clients/utils'
import { NgQueryResult, TableProperties } from '@/lib/db/models'
import {
  Candidate,
  CliOpenConnection,
  READ_ONLY_HINT,
  attempt,
  formatQueryResult,
  ENABLE_CLI_HINT,
  quotedNames,
  ref,
  toEntity,
  toColumn,
  connectionDisplayName,
} from './cliServer/commands'
import {
  CLI_ENTITY_TYPES,
  CLI_TAB_TYPES,
  CliConnectionRef,
  CliCreateTabRequest,
  CliEntity,
  CliError,
  CliTabSummary,
  ConnectionsParams,
  ConnectionsResult,
  CreateTabParams,
  CreateTabResult,
  EntitiesParams,
  EntitiesResult,
  QueryParams,
  QueryResult,
  SchemasParams,
  SchemasResult,
  StructureParams,
  StructureResult,
  SwitchTabParams,
  SwitchTabResult,
  isCliError,
} from '@/cli/protocol'
import { uuidv4 } from '@/lib/uuid'
import { pendingRendererRequests } from './cliServer/rendererRequests'

export const RENDERER_RESPONSE_TIMEOUT_MS = 4000

interface PortLike {
  postMessage(message: unknown): void
}

function isLocalConnection(config: IConnection): boolean {
  return config.workspaceId == null || config.workspaceId === LocalWorkspace.id
}

export class UtilityApi {
  private readonly config: BksConfig

  constructor(readonly options: { config: BksConfig }) {
    this.config = options.config
    this.connections = this.connections.bind(this)
    this.schemas = this.schemas.bind(this)
    this.entities = this.entities.bind(this)
    this.structure = this.structure.bind(this)
    this.query = this.query.bind(this)
    this.createTab = this.createTab.bind(this)
    this.switchTab = this.switchTab.bind(this)
  }

  getCliApis() {
    return [
      { name: 'connections', func: this.connections },
      { name: 'schemas', func: this.schemas },
      { name: 'entities', func: this.entities },
      { name: 'structure', func: this.structure },
      { name: 'query', func: this.query },
      { name: 'createTab', func: this.createTab },
      { name: 'switchTab', func: this.switchTab },
    ]
  }

  async connections(_params: ConnectionsParams): Promise<ConnectionsResult> {
    const all = await this.candidates()
    return { connections: all.map((item) => item.summary) }
  }

  async schemas(params: SchemasParams): Promise<SchemasResult> {
    return this.asConnection(params, async (client, connection) => {
      const schemas = await client.listSchemas()
      return { connection, schemas: schemas || [] }
    })
  }

  async entities(params: EntitiesParams): Promise<EntitiesResult> {
    for (const type of params.entityTypes || []) {
      if (!(CLI_ENTITY_TYPES as readonly string[]).includes(type)) {
        throw new CliError('USAGE', `Unknown entity type "${type}".`, {
          hint: `Entity types: ${CLI_ENTITY_TYPES.join(', ')}.`,
        })
      }
    }
    return this.asConnection(params, async (client, connection) => {
      const warnings: string[] = []
      const types = params.entityTypes || [...CLI_ENTITY_TYPES]
      const filter = { schema: params.schema ?? null }
      const all: CliEntity[] = []
      if (types.includes('table')) {
        const tables = await attempt('Could not list tables', warnings, () => this.listTables(client, filter))
        if (tables) {
          all.push(...tables)
        }
      }
      if (types.includes('view')) {
        const views = await attempt('Could not list views', warnings, () => this.listViews(client, filter))
        if (views) {
          all.push(...views)
        }
      }
      if (types.includes('materialized-view')) {
        const materializedViews = await attempt('Could not list materialized-views', warnings, () =>
          this.listMaterializedViews(client, filter)
        )
        if (materializedViews) {
          all.push(...materializedViews)
        }
      }
      if (types.includes('routine')) {
        const routines = await attempt('Could not list routines', warnings, () => this.listRoutines(client, filter))
        if (routines) {
          all.push(...routines)
        }
      }
      // Not every client honours filter.schema, so filter here as well. Entities
      // without a schema (sqlite, mysql) are kept.
      const entities = params.schema ? all.filter((e) => !e.schema || e.schema === params.schema) : all
      return { connection, schema: params.schema ?? null, entities, warnings }
    })
  }

  async structure(params: StructureParams): Promise<StructureResult> {
    return this.asConnection(params, async (client, connection) => {
      if (!params.name) {
        throw new CliError('USAGE', 'structure needs the name of a table or view.')
      }
      const found = await this.findEntity(client, params.name, params.schema)
      const entity = found.entity
      const warnings = found.warnings
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
        if (entity.entityType === 'table') {
          return client.getTableCreateScript(entity.name, target)
        }
        const lines =
          entity.entityType === 'view'
            ? await client.getViewCreateScript(entity.name, target)
            : await client.getMaterializedViewCreateScript(entity.name, target)
        return (lines || []).join('\n')
      })

      return {
        connection,
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
    })
  }

  async query(params: QueryParams): Promise<QueryResult> {
    return this.asConnection(params, async (client, connection) => {
      if (!params.sql || !params.sql.trim()) {
        throw new CliError('USAGE', 'No SQL was given to run.')
      }
      let results: NgQueryResult[]
      try {
        // forceReadOnly is the same switch the plugin sandbox uses: the client
        // rejects anything but reads, whatever the connection's own mode is.
        // arrayMode (postgres, sqlite) and rowsAsArray (mysql) keep duplicate
        // column names apart; clients that don't know the options ignore them.
        results = await client.executeQuery(params.sql, { forceReadOnly: true, arrayMode: true, rowsAsArray: true })
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
      return { connection, results: (results || []).map(formatQueryResult) }
    })
  }

  async createTab(params: CreateTabParams): Promise<CreateTabResult> {
    const tab = params.tab
    if (!(CLI_TAB_TYPES as readonly string[]).includes(tab)) {
      throw new CliError('USAGE', `Unknown tab type "${tab}".`, {
        hint: `Tab types: ${CLI_TAB_TYPES.join(', ')}.`,
      })
    }
    return this.asConnection(params, async (_client, connection, open) => {
      const request: CliCreateTabRequest = { tab, sql: params.sql }
      const summary = await this.askRendererToCreateTab(open, request)
      return { connection, ...request, ...summary }
    })
  }

  async switchTab(params: SwitchTabParams): Promise<SwitchTabResult> {
    if (!params.tabId) {
      throw new CliError('USAGE', 'switch-tab needs the id of a tab.')
    }
    return this.asConnection(params, async (_client, connection, open) => {
      const summary = await this.askRendererToSwitchTab(open, String(params.tabId))
      return { connection, ...summary }
    })
  }

  protected openConnections(): CliOpenConnection[] {
    const result: CliOpenConnection[] = []
    for (const [id, state] of allStates()) {
      if (!state.connection) continue
      result.push({
        id,
        config: state.usedConfig,
        database: state.database,
        client: state.connection,
      })
    }
    return result
  }

  async resolveCliEnabled(connection: CliOpenConnection): Promise<boolean> {
    if (this.config.cli?.enableForAllConnections) {
      return true
    }
    const config = connection.config
    if (!config) {
      return false
    }
    if (config.id && isLocalConnection(config)) {
      // The saved row, so a change to the checkbox applies without reconnecting.
      const saved = await SavedConnection.findOneBy({ id: config.id })
      if (saved) {
        return !!saved.cliEnabled
      }
    }
    return !!config.cliEnabled
  }

  protected async askRendererToCreateTab(connection: CliOpenConnection, request: CliCreateTabRequest): Promise<CliTabSummary> {
    return (await this.askRenderer(this.rendererPort(connection), 'cli/createTab', { ...request })) as CliTabSummary
  }

  protected async askRendererToSwitchTab(connection: CliOpenConnection, tabId: string): Promise<CliTabSummary> {
    return (await this.askRenderer(this.rendererPort(connection), 'cli/switchTab', { tabId })) as CliTabSummary
  }

  /**
   * Picks the open connection the params name (or the only enabled one) and
   * runs `run` on it. Errors from `run` get the connection added to their details.
   */
  private async asConnection<T>(
    params: { connection?: string },
    run: (client: BasicDatabaseClient<any, any>, connection: CliConnectionRef, open: CliOpenConnection) => Promise<T>
  ): Promise<T> {
    const selected = await this.selectConnection(params.connection)
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

  private async listTables(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<CliEntity[]> {
    const tables = await client.listTables(filter);
    return tables.map((t) => toEntity(t, 'table'));
  }

  private async listViews(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<CliEntity[]> {
    const views = await client.listViews(filter);
    return views.map((v) => toEntity(v, 'view'));
  }

  private async listMaterializedViews(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<CliEntity[]> {
    const materializedViews = await client.listMaterializedViews(filter);
    return materializedViews.map((v) => toEntity(v, 'materialized-view'));
  }

  private async listRoutines(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<CliEntity[]> {
    const routines = await client.listRoutines(filter);
    return routines.map((r) => ({
      ...toEntity(r, 'routine'),
      routineType: r.type,
      returnType: r.returnType,
    }));
  }

  private async findEntity(
    client: BasicDatabaseClient<any, any>,
    name: string,
    schema: string | undefined
  ): Promise<{ entity: CliEntity; warnings: string[] }> {
    const warnings: string[] = []
    const filter = { schema: schema ?? null }
    const loaded: CliEntity[] = []
    const tables = await attempt('Could not list tables', warnings, () => this.listTables(client, filter))
    if (tables) {
      loaded.push(...tables)
    }
    const views = await attempt('Could not list views', warnings, () => this.listViews(client, filter))
    if (views) {
      loaded.push(...views)
    }
    const materializedViews = await attempt('Could not list materialized-views', warnings, () =>
      this.listMaterializedViews(client, filter)
    )
    if (materializedViews) {
      loaded.push(...materializedViews)
    }
    // Not every client honours filter.schema, so filter here as well. Entities
    // without a schema (sqlite, mysql) are kept.
    const all = schema ? loaded.filter((e) => !e.schema || e.schema === schema) : loaded

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

  private async candidates(): Promise<Candidate[]> {
    const open = this.openConnections()
    return Promise.all(
      open.map(async (connection) => ({
        connection,
        summary: {
          id: connection.id,
          name: connectionDisplayName(connection),
          connectionType: connection.config?.connectionType || connection.client?.connectionType || null,
          host: connection.config?.host ?? null,
          database: connection.database || connection.config?.defaultDatabase || null,
          readOnlyMode: !!connection.config?.readOnlyMode,
          cliEnabled: await this.resolveCliEnabled(connection),
        }
      }))
    )
  }

  private async selectConnection(requested?: string): Promise<Candidate> {
    const all = await this.candidates()
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

  private rendererPort(connection: CliOpenConnection) {
    const port = state(connection.id)?.port
    if (!port) {
      throw new CliError('INTERNAL', 'The window that owns this connection is not reachable.')
    }
    return port
  }

  /** Posts a message to a renderer and waits for it to respond through respondRendererRequest. */
  private askRenderer(
    port: PortLike,
    type: string,
    input: Record<string, unknown>,
    timeoutMs = RENDERER_RESPONSE_TIMEOUT_MS
  ): Promise<unknown> {
    const requestId = uuidv4()
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRendererRequests.delete(requestId)
        reject(new CliError('INTERNAL', `The app window did not respond within ${timeoutMs}ms.`))
      }, timeoutMs)
      pendingRendererRequests.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      port.postMessage({ type, input: { ...input, requestId } })
    })
  }
}
