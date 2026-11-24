import { FavoriteQuery } from '@/common/appdb/models/favorite_query'
import { allStates, state } from '@/handlers/handlerState'
import _ from 'lodash'
import { BasicDatabaseClient } from '@/lib/db/clients/BasicDatabaseClient'
import { errorMessages as clientErrorMessages } from '@/lib/db/clients/utils'
import { NgQueryResult, TableProperties } from '@/lib/db/models'
import {
  Candidate,
  CliConnectionHandle,
  READ_ONLY_HINT,
  attempt,
  formatQueryResult,
  CHANGE_ACCESS_HINT,
  CliCallContext,
  UNKNOWN_CLIENT_NAME,
  quotedNames,
  toEntity,
  toColumn,
  connectionDisplayName,
} from './cliServer/commands'
import {
  CLI_WRITE_QUERY_PERMISSIONS,
  CliAccess,
  OpenConnection,
  CliSavedQuery,
  CliSavedQuerySummary,
  CreateSavedQueryParams,
  AskApprovalParams,
  AskApprovalResult,
  SavedQueriesParams,
  SavedQueriesResult,
  SavedQueryParams,
  SavedQueryResult,
  UpdateSavedQueryParams,
  CLI_ENTITY_TYPES,
  CLI_TAB_TYPES,
  CliCreateTabRequest,
  Entity,
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
} from '@beekeeperstudio/cli-client'
import { uuidv4 } from '@/lib/uuid'
import { CliAccessRequest, pendingRendererRequests } from './cliServer/rendererRequests'
import { SessionCliGrantStore, CliGrantStore, normalizeAccess } from './cliServer/grants'
import { disallowedStatements } from './cliServer/queryPermissions'

export const RENDERER_RESPONSE_TIMEOUT_MS = 4000

const EXCERPT_LENGTH = 250

interface PortLike {
  postMessage(message: unknown): void
}

/** For calls made without a socket, e.g. from tests. */
const NO_CONTEXT: CliCallContext = { client: { name: UNKNOWN_CLIENT_NAME }, signal: new AbortController().signal }

type Permission = 'openTabs' | 'savedQueriesRead' | 'savedQueriesWrite'

const PERMISSION_LABELS: Record<Permission, string> = {
  openTabs: 'open tabs',
  savedQueriesRead: 'read saved queries',
  savedQueriesWrite: 'write saved queries',
}

function toSavedQuerySummary(query: FavoriteQuery): CliSavedQuerySummary {
  return {
    id: query.id,
    title: query.title,
    excerpt: query.excerpt ?? '',
    folderId: query.queryFolderId ?? null,
    updatedAt: query.updatedAt ? new Date(query.updatedAt).toISOString() : null,
  }
}

/** An open approval dialog and how many callers still wait on it. */
interface PendingApproval {
  answer: Promise<CliAccess | null>
  cancel: AbortController
  waiting: number
}

export class UtilityApi {
  private readonly grants: CliGrantStore
  /** One approval dialog per client and connection, however many requests wait on it. */
  private readonly pendingApprovals = new Map<string, PendingApproval>()

  constructor(readonly options: { grants?: CliGrantStore } = {}) {
    this.grants = options.grants ?? new SessionCliGrantStore()
    this.connections = this.connections.bind(this)
    this.schemas = this.schemas.bind(this)
    this.entities = this.entities.bind(this)
    this.structure = this.structure.bind(this)
    this.query = this.query.bind(this)
    this.createTab = this.createTab.bind(this)
    this.switchTab = this.switchTab.bind(this)
    this.savedQueries = this.savedQueries.bind(this)
    this.savedQuery = this.savedQuery.bind(this)
    this.createSavedQuery = this.createSavedQuery.bind(this)
    this.updateSavedQuery = this.updateSavedQuery.bind(this)
    this.askApproval = this.askApproval.bind(this)
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
      { name: 'savedQueries', func: this.savedQueries },
      { name: 'savedQuery', func: this.savedQuery },
      { name: 'createSavedQuery', func: this.createSavedQuery },
      { name: 'updateSavedQuery', func: this.updateSavedQuery },
      { name: 'askApproval', func: this.askApproval },
    ]
  }

  async connections(_params: ConnectionsParams, context: CliCallContext = NO_CONTEXT): Promise<ConnectionsResult> {
    const all = await this.candidates(context.client.name)
    return { connections: all.map((item) => item.summary) }
  }

  async schemas(params: SchemasParams, context: CliCallContext = NO_CONTEXT): Promise<SchemasResult> {
    return this.asConnection(params, context, async (client) => {
      const schemas = await client.listSchemas()
      return { schemas: schemas || [] }
    })
  }

  async entities(params: EntitiesParams, context: CliCallContext = NO_CONTEXT): Promise<EntitiesResult> {
    for (const type of params.entityTypes || []) {
      if (!(CLI_ENTITY_TYPES as readonly string[]).includes(type)) {
        throw new CliError('USAGE', `Unknown entity type "${type}".`, {
          hint: `Entity types: ${CLI_ENTITY_TYPES.join(', ')}.`,
        })
      }
    }
    return this.asConnection(params, context, async (client) => {
      const warnings: string[] = []
      const types = params.entityTypes || [...CLI_ENTITY_TYPES]
      const filter = { schema: params.schema ?? null }
      const all: Entity[] = []
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
      return { schema: params.schema || undefined, entities, warnings }
    })
  }

  async structure(params: StructureParams, context: CliCallContext = NO_CONTEXT): Promise<StructureResult> {
    return this.asConnection(params, context, async (client) => {
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

  async query(params: QueryParams, context: CliCallContext = NO_CONTEXT): Promise<QueryResult> {
    if (!params.sql || !params.sql.trim()) {
      throw new CliError('USAGE', 'No SQL was given to run.')
    }
    return this.asConnection(params, context, async (client, connection, _open, access) => {
      const disallowed = disallowedStatements(params.sql, client.dialect, access.queryTypes)
      if (disallowed.length > 0) {
        const needs = [...new Set(disallowed.flatMap((s) => s.needs))]
        throw new CliError(
          'NOT_PERMITTED',
          `${context.client.name} is not allowed to run ${needs.join(', ')} statements on "${connection.name}".`,
          { hint: CHANGE_ACCESS_HINT, details: { statements: disallowed } }
        )
      }
      const canWrite = access.queryTypes.some((type) => CLI_WRITE_QUERY_PERMISSIONS.includes(type))
      let results: NgQueryResult[]
      try {
        // A client that may only read also gets the database client's own
        // read only check. arrayMode (postgres, sqlite) and rowsAsArray (mysql)
        // keep duplicate column names apart; clients that don't know them ignore them.
        results = await client.executeQuery(params.sql, { forceReadOnly: !canWrite, arrayMode: true, rowsAsArray: true })
      } catch (error) {
        const message: string = error?.message ?? String(error)
        if (message === clientErrorMessages.readOnly) {
          if (client.readOnlyMode) {
            throw new CliError('READ_ONLY', `"${connection.name}" is in read only mode, so the statement was rejected.`, {
              hint: READ_ONLY_HINT,
            })
          }
          throw new CliError('NOT_PERMITTED', `${context.client.name} may only read on "${connection.name}".`, {
            hint: CHANGE_ACCESS_HINT,
          })
        }
        throw new CliError('QUERY_FAILED', message, {
          details: _.omitBy(
            { code: error?.code, detail: error?.detail, hint: error?.hint, position: error?.position },
            _.isNil
          ),
        })
      }
      return { results: (results || []).map(formatQueryResult) }
    })
  }

  async createTab(params: CreateTabParams, context: CliCallContext = NO_CONTEXT): Promise<CreateTabResult> {
    const tab = params.tab
    if (!(CLI_TAB_TYPES as readonly string[]).includes(tab)) {
      throw new CliError('USAGE', `Unknown tab type "${tab}".`, {
        hint: `Tab types: ${CLI_TAB_TYPES.join(', ')}.`,
      })
    }
    return this.asConnection(params, context, async (_client, connection, open, access) => {
      this.require(access, 'openTabs', context, connection)
      const request: CliCreateTabRequest = { tab, sql: params.sql }
      const summary = await this.askRendererToCreateTab(open, request)
      return { ...request, ...summary }
    })
  }

  async switchTab(params: SwitchTabParams, context: CliCallContext = NO_CONTEXT): Promise<SwitchTabResult> {
    if (!params.tabId) {
      throw new CliError('USAGE', 'switch-tab needs the id of a tab.')
    }
    return this.asConnection(params, context, async (_client, connection, open, access) => {
      this.require(access, 'openTabs', context, connection)
      const summary = await this.askRendererToSwitchTab(open, String(params.tabId))
      return { ...summary }
    })
  }

  async savedQueries(params: SavedQueriesParams, context: CliCallContext = NO_CONTEXT): Promise<SavedQueriesResult> {
    return this.asConnection(params, context, async (_client, connection, _open, access) => {
      this.require(access, 'savedQueriesRead', context, connection)
      const queries = await FavoriteQuery.find({ order: { title: 'ASC' } })
      return { savedQueries: queries.map(toSavedQuerySummary) }
    })
  }

  async savedQuery(params: SavedQueryParams, context: CliCallContext = NO_CONTEXT): Promise<SavedQueryResult> {
    const id = this.savedQueryId(params.id)
    return this.asConnection(params, context, async (_client, connection, _open, access) => {
      this.require(access, 'savedQueriesRead', context, connection)
      return { savedQuery: await this.loadSavedQuery(id) }
    })
  }

  async createSavedQuery(params: CreateSavedQueryParams, context: CliCallContext = NO_CONTEXT): Promise<SavedQueryResult> {
    const title = params.title?.trim()
    if (!title) {
      throw new CliError('USAGE', 'A saved query needs a title.')
    }
    if (!params.text?.trim()) {
      throw new CliError('USAGE', 'A saved query needs SQL text.')
    }
    return this.asConnection(params, context, async (_client, connection, open, access) => {
      this.require(access, 'savedQueriesWrite', context, connection)
      const query = new FavoriteQuery().withProps({
        title,
        text: params.text,
        excerpt: params.text.slice(0, EXCERPT_LENGTH),
        database: open.database,
      })
      await query.save()
      this.notifySavedQueryChanged(open, query.id)
      return { savedQuery: await this.loadSavedQuery(query.id) }
    })
  }

  async updateSavedQuery(params: UpdateSavedQueryParams, context: CliCallContext = NO_CONTEXT): Promise<SavedQueryResult> {
    const id = this.savedQueryId(params.id)
    const title = params.title?.trim()
    if (params.title !== undefined && !title) {
      throw new CliError('USAGE', 'A saved query title cannot be empty.')
    }
    if (params.text !== undefined && !params.text.trim()) {
      throw new CliError('USAGE', 'A saved query cannot be emptied.')
    }
    if (title === undefined && params.text === undefined) {
      throw new CliError('USAGE', 'Nothing to update: pass a new title, new SQL, or both.')
    }
    return this.asConnection(params, context, async (_client, connection, open, access) => {
      this.require(access, 'savedQueriesWrite', context, connection)
      const query = await this.findSavedQuery(id)
      if (title !== undefined) {
        query.title = title
      }
      if (params.text !== undefined) {
        query.text = params.text
        query.excerpt = params.text.slice(0, EXCERPT_LENGTH)
      }
      await query.save()
      this.notifySavedQueryChanged(open, id)
      return { savedQuery: await this.loadSavedQuery(id) }
    })
  }

  /** Shows the approval dialog, unless the client is already approved for the connection. */
  async askApproval(params: AskApprovalParams, context: CliCallContext = NO_CONTEXT): Promise<AskApprovalResult> {
    const selected = await this.selectConnection(params.connection, context.client.name)
    const clientName = context.client.name
    const existing = await this.grants.find(clientName, selected.connection)
    if (existing) {
      return { newlyApproved: false, access: existing }
    }
    const key = `${selected.connection.id}\0${clientName}`
    let dialog = this.pendingApprovals.get(key)
    if (!dialog) {
      const cancel = new AbortController()
      const request = {
        clientName,
        connectionName: selected.summary.name,
        readOnlyMode: selected.summary.readOnlyMode,
      }
      const answer = this.askRendererForAccess(selected.connection, request, cancel.signal)
        .then(async (access) => {
          if (!access || cancel.signal.aborted) {
            return null
          }
          const granted = normalizeAccess(access, selected.summary.readOnlyMode)
          await this.grants.save(clientName, selected.connection, granted)
          return granted
        })
        .finally(() => this.pendingApprovals.delete(key))
      dialog = { answer, cancel, waiting: 0 }
      this.pendingApprovals.set(key, dialog)
    }
    const access = await this.waitForApproval(dialog, context.signal)
    if (!access) {
      throw new CliError('ACCESS_DENIED', `Access to "${selected.summary.name}" was denied for ${clientName}.`, {
        hint: 'Run `bks ask-approval --timeout 0` again to ask again.',
      })
    }
    return { newlyApproved: true, access }
  }

  /** Waits for the dialog's answer, and closes the dialog once every caller has hung up. */
  private async waitForApproval(dialog: PendingApproval, signal: AbortSignal): Promise<CliAccess | null> {
    dialog.waiting += 1
    let onAbort: () => void = () => undefined
    const hungUp = new Promise<never>((_resolve, reject) => {
      onAbort = () => reject(new CliError('INTERNAL', 'The caller hung up before the dialog was answered.'))
      if (signal.aborted) {
        onAbort()
      } else {
        signal.addEventListener('abort', onAbort, { once: true })
      }
    })
    try {
      return await Promise.race([dialog.answer, hungUp])
    } finally {
      signal.removeEventListener('abort', onAbort)
      dialog.waiting -= 1
      if (dialog.waiting === 0 && signal.aborted) {
        dialog.cancel.abort()
      }
    }
  }

  private savedQueryId(raw: unknown): number {
    const id = Number(raw)
    if (!Number.isInteger(id) || id < 1) {
      throw new CliError('USAGE', `"${raw}" is not a saved query id.`, {
        hint: 'Run `saved-queries list` to see the ids.',
      })
    }
    return id
  }

  private async findSavedQuery(id: number): Promise<FavoriteQuery> {
    // text is not selected by default.
    const query = await FavoriteQuery.createQueryBuilder('q').addSelect('q.text').where('q.id = :id', { id }).getOne()
    if (!query) {
      throw new CliError('NOT_FOUND', `No saved query with id ${id}.`, {
        hint: 'Run `saved-queries list` to see the ids.',
      })
    }
    return query
  }

  private async loadSavedQuery(id: number): Promise<CliSavedQuery> {
    const query = await this.findSavedQuery(id)
    return { ...toSavedQuerySummary(query), text: query.text }
  }

  /** Lets the window refresh its saved query list. */
  protected notifySavedQueryChanged(connection: CliConnectionHandle, id: number): void {
    state(connection.id)?.port?.postMessage({ type: 'cli/savedQueryChanged', input: { id } })
  }

  private require(access: CliAccess, permission: Permission, context: CliCallContext, connection: OpenConnection): void {
    if (!access[permission]) {
      throw new CliError(
        'NOT_PERMITTED',
        `${context.client.name} is not allowed to ${PERMISSION_LABELS[permission]} on "${connection.name}".`,
        { hint: CHANGE_ACCESS_HINT }
      )
    }
  }

  protected openConnections(): CliConnectionHandle[] {
    const result: CliConnectionHandle[] = []
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

  /** Shows the approval dialog in the connection's window. Resolves null when the user denies. */
  protected async askRendererForAccess(
    connection: CliConnectionHandle,
    request: CliAccessRequest,
    signal: AbortSignal
  ): Promise<CliAccess | null> {
    let answer: { access: CliAccess | null }
    try {
      answer = (await this.askRenderer(this.rendererPort(connection), 'cli/requestAccess', { ...request }, 0, signal)) as {
        access: CliAccess | null
      }
    } catch (error) {
      if (signal.aborted) {
        return null
      }
      throw error
    }
    return answer?.access ?? null
  }

  /** The client's approval for the connection. Asking for one is a separate, explicit command. */
  private async authorize(context: CliCallContext, connection: CliConnectionHandle, summary: OpenConnection): Promise<CliAccess> {
    const clientName = context.client.name
    const existing = await this.grants.find(clientName, connection)
    if (!existing) {
      throw new CliError('NOT_APPROVED', `${clientName} is not approved to use "${summary.name}".`, {
        hint: `Run \`bks ask-approval --connection "${summary.name}" --timeout 0\`, then approve it in Beekeeper Studio.`,
      })
    }
    return existing
  }

  protected async askRendererToCreateTab(connection: CliConnectionHandle, request: CliCreateTabRequest): Promise<CliTabSummary> {
    return (await this.askRenderer(this.rendererPort(connection), 'cli/createTab', { ...request })) as CliTabSummary
  }

  protected async askRendererToSwitchTab(connection: CliConnectionHandle, tabId: string): Promise<CliTabSummary> {
    return (await this.askRenderer(this.rendererPort(connection), 'cli/switchTab', { tabId })) as CliTabSummary
  }

  /**
   * Picks the open connection the params name (or the only candidate), makes
   * sure the client is approved for it and runs `run` on it.
   */
  private async asConnection<T>(
    params: { connection?: string },
    context: CliCallContext,
    run: (
      client: BasicDatabaseClient<any, any>,
      connection: OpenConnection,
      open: CliConnectionHandle,
      access: CliAccess
    ) => Promise<T>
  ): Promise<T> {
    const selected = await this.selectConnection(params.connection, context.client.name)
    const access = await this.authorize(context, selected.connection, selected.summary)
    return run(selected.connection.client, selected.summary, selected.connection, access)
  }

  private async listTables(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<Entity[]> {
    const tables = await client.listTables(filter);
    return tables.map((t) => toEntity(t, 'table'));
  }

  private async listViews(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<Entity[]> {
    const views = await client.listViews(filter);
    return views.map((v) => toEntity(v, 'view'));
  }

  private async listMaterializedViews(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<Entity[]> {
    const materializedViews = await client.listMaterializedViews(filter);
    return materializedViews.map((v) => toEntity(v, 'materialized-view'));
  }

  private async listRoutines(client: BasicDatabaseClient, filter: { schema: string | null }): Promise<Entity[]> {
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
  ): Promise<{ entity: Entity; warnings: string[] }> {
    const warnings: string[] = []
    const filter = { schema: schema ?? null }
    const loaded: Entity[] = []
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

  private async candidates(clientName: string): Promise<Candidate[]> {
    const open = this.openConnections()
    return Promise.all(
      open.map(async (connection) => ({
        connection,
        summary: {
          id: connection.id,
          name: connectionDisplayName(connection),
          connectionType: connection.config?.connectionType || connection.client?.connectionType || null,
          defaultDatabase: connection.config?.defaultDatabase || connection.database || undefined,
          readOnlyMode: !!connection.config?.readOnlyMode,
          approved: !!(await this.grants.find(clientName, connection)),
        }
      }))
    )
  }

  private async selectConnection(requested: string | undefined, clientName: string): Promise<Candidate> {
    const all = await this.candidates(clientName)
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
      return matches[0]
    }

    if (all.length === 1) {
      return all[0]
    }
    // With several open, the one this client is already approved for is the obvious pick.
    const approved = all.filter((item) => item.summary.approved)
    if (approved.length === 1) {
      return approved[0]
    }
    throw new CliError(
      'AMBIGUOUS_CONNECTION',
      `${all.length} connections are open: ${quotedNames(all)}.`,
      { hint: 'Pass --connection <name> to pick one.', details }
    )
  }

  private rendererPort(connection: CliConnectionHandle) {
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
    timeoutMs = RENDERER_RESPONSE_TIMEOUT_MS,
    signal?: AbortSignal
  ): Promise<unknown> {
    const requestId = uuidv4()
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        if (!pendingRendererRequests.delete(requestId)) {
          return
        }
        if (timer) {
          clearTimeout(timer)
        }
        port.postMessage({ type: 'cli/cancelRequest', input: { requestId } })
        reject(new CliError('INTERNAL', 'The request was cancelled.'))
      }
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              pendingRendererRequests.delete(requestId)
              reject(new CliError('INTERNAL', `The app window did not respond within ${timeoutMs}ms.`))
            }, timeoutMs)
          : null
      pendingRendererRequests.set(requestId, {
        resolve: (value) => {
          if (timer) {
            clearTimeout(timer)
          }
          signal?.removeEventListener('abort', onAbort)
          resolve(value)
        },
        reject: (error) => {
          if (timer) {
            clearTimeout(timer)
          }
          signal?.removeEventListener('abort', onAbort)
          reject(error)
        },
      })
      signal?.addEventListener('abort', onAbort, { once: true })
      port.postMessage({ type, input: { ...input, requestId } })
    })
  }
}
