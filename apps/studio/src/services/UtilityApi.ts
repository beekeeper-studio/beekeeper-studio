import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { getConnectedStates, state, State } from "@/handlers/handlerState";
import _ from "lodash";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { errorMessages as clientErrorMessages } from "@/lib/db/clients/utils";
import { NgQueryResult, TableProperties } from "@/lib/db/models";
import {
  READ_ONLY_HINT,
  attempt,
  formatQueryResult,
  CHANGE_ACCESS_HINT,
  clientInfo,
  toEntity,
  toColumn,
  connectionDisplayName,
} from "./cliServer/commands";
import {
  QUERY_PERMISSIONS,
  WRITE_QUERY_PERMISSIONS,
  Access,
  OpenConnection,
  SavedQuery,
  SavedQuerySummary,
  CreateSavedQueryParams,
  RequestApprovalParams,
  RequestApprovalResult,
  SavedQueriesParams,
  SavedQueriesResult,
  SavedQueryParams,
  SavedQueryResult,
  UpdateSavedQueryParams,
  ENTITY_TYPES,
  TAB_TYPES,
  CreateTabRequest,
  Entity,
  CliError,
  ConnectionsParams,
  ConnectionsResult,
  OpenTabParams,
  OpenTabResult,
  EntitiesParams,
  EntitiesResult,
  QueryParams,
  QueryResult,
  SchemasParams,
  SchemasResult,
  StructureParams,
  StructureResult,
  SwitchTabParams,
  ApprovalRequester,
} from "@beekeeperstudio/rpc";
import type { CallContext } from "@beekeeperstudio/rpc";
import type { RendererMethods } from "@/lib/utility/RendererMethods";
import { AuthorizedClient } from "./cliServer/AuthorizedClient";
import { disallowedStatements } from "./cliServer/queryPermissions";

const EXCERPT_LENGTH = 250;

/** For calls made without a socket, e.g. from tests. */
const NO_CONTEXT: CallContext = {
  signal: new AbortController().signal,
};

type Permission = "openTabs" | "savedQueriesRead" | "savedQueriesWrite";

const PERMISSION_LABELS: Record<Permission, string> = {
  openTabs: "open tabs",
  savedQueriesRead: "read saved queries",
  savedQueriesWrite: "write saved queries",
};

function toSavedQuerySummary(query: FavoriteQuery): SavedQuerySummary {
  return {
    id: query.id,
    title: query.title,
    excerpt: query.excerpt ?? "",
    folderId: query.queryFolderId ?? null,
    updatedAt: query.updatedAt ? new Date(query.updatedAt).toISOString() : null,
  };
}

/** An open approval dialog and how many callers still wait on it. */
interface PendingApproval {
  answer: Promise<Access | null>;
  cancel: AbortController;
  waiting: number;
}

export class UtilityApi {
  /** One approval dialog per client and connection, however many requests wait on it. */
  private readonly pendingApprovals = new Map<string, PendingApproval>();

  constructor() {
    this.getConnections = this.getConnections.bind(this);
    this.getSchemas = this.getSchemas.bind(this);
    this.getEntities = this.getEntities.bind(this);
    this.getTableStructure = this.getTableStructure.bind(this);
    this.runQuery = this.runQuery.bind(this);
    this.openTab = this.openTab.bind(this);
    this.switchTab = this.switchTab.bind(this);
    this.getSavedQueries = this.getSavedQueries.bind(this);
    this.getSavedQuery = this.getSavedQuery.bind(this);
    this.createSavedQuery = this.createSavedQuery.bind(this);
    this.updateSavedQuery = this.updateSavedQuery.bind(this);
    this.requestApproval = this.requestApproval.bind(this);
  }

  getCliApis() {
    return [
      { name: "getConnections", func: this.getConnections },
      { name: "getSchemas", func: this.getSchemas },
      { name: "getEntities", func: this.getEntities },
      { name: "getTableStructure", func: this.getTableStructure },
      { name: "runQuery", func: this.runQuery },
      { name: "openTab", func: this.openTab },
      { name: "switchTab", func: this.switchTab },
      { name: "getSavedQueries", func: this.getSavedQueries },
      { name: "getSavedQuery", func: this.getSavedQuery },
      { name: "createSavedQuery", func: this.createSavedQuery },
      { name: "updateSavedQuery", func: this.updateSavedQuery },
      { name: "requestApproval", func: this.requestApproval },
    ];
  }

  async getConnections(
    _params: ConnectionsParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<ConnectionsResult> {
    const client = clientInfo(context.request?.client);
    const connections = getConnectedStates().map((connectionState) => ({
      id: connectionState.id,
      name: connectionDisplayName(connectionState),
      connectionType:
        connectionState.usedConfig?.connectionType ||
        connectionState.connection?.connectionType ||
        null,
      defaultDatabase:
        connectionState.usedConfig?.defaultDatabase ||
        connectionState.database ||
        undefined,
      readOnlyMode: !!connectionState.usedConfig?.readOnlyMode,
      approved: connectionState.cliClients.has(client.name),
    }));
    return { connections };
  }

  async getSchemas(
    params: SchemasParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<SchemasResult> {
    const state = await this.findState(context, params.connection);
    const schemas = await state.connection.listSchemas();
    return { schemas: schemas || [] };
  }

  async getEntities(
    params: EntitiesParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<EntitiesResult> {
    for (const type of params.entityTypes || []) {
      if (!(ENTITY_TYPES as readonly string[]).includes(type)) {
        throw new CliError("USAGE", `Unknown entity type "${type}".`, {
          hint: `Entity types: ${ENTITY_TYPES.join(", ")}.`,
        });
      }
    }
    const state = await this.findState(context, params.connection);
    const warnings: string[] = [];
    const types = params.entityTypes || [...ENTITY_TYPES];
    const filter = { schema: params.schema ?? null };
    const all: Entity[] = [];
    if (types.includes("table")) {
      const tables = await attempt("Could not list tables", warnings, () =>
        this.listTables(state.connection, filter),
      );
      if (tables) {
        all.push(...tables);
      }
    }
    if (types.includes("view")) {
      const views = await attempt("Could not list views", warnings, () =>
        this.listViews(state.connection, filter),
      );
      if (views) {
        all.push(...views);
      }
    }
    if (types.includes("materialized-view")) {
      const materializedViews = await attempt(
        "Could not list materialized-views",
        warnings,
        () => this.listMaterializedViews(state.connection, filter),
      );
      if (materializedViews) {
        all.push(...materializedViews);
      }
    }
    if (types.includes("routine")) {
      const routines = await attempt("Could not list routines", warnings, () =>
        this.listRoutines(state.connection, filter),
      );
      if (routines) {
        all.push(...routines);
      }
    }
    // Not every state.connection honours filter.schema, so filter here as well. Entities
    // without a schema (sqlite, mysql) are kept.
    const entities = params.schema
      ? all.filter((e) => !e.schema || e.schema === params.schema)
      : all;
    return { schema: params.schema || undefined, entities, warnings };
  }

  async getTableStructure(
    params: StructureParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<StructureResult> {
    const state = await this.findState(context, params.connection);
    if (!params.name) {
      throw new CliError(
        "USAGE",
        "structure needs the name of a table or view.",
      );
    }
    const found = await this.findEntity(
      state.connection,
      params.name,
      params.schema,
    );
    const entity = found.entity;
    const warnings = found.warnings;
    const target = entity.schema ?? undefined;

    const rawColumns =
      (await attempt("Could not list columns", warnings, () =>
        entity.entityType === "materialized-view"
          ? state.connection.listMaterializedViewColumns(entity.name, target)
          : state.connection.listTableColumns(entity.name, target),
      )) || [];
    const columns = rawColumns.map(toColumn);

    let primaryKeys: string[] = [];
    let properties: TableProperties | null = null;
    if (entity.entityType === "table") {
      const keys = await attempt("Could not read primary keys", warnings, () =>
        state.connection.getPrimaryKeys(entity.name, target),
      );
      primaryKeys = _.sortBy(keys || [], "position").map(
        (key) => key.columnName,
      );
      properties = await attempt(
        "Could not read table properties",
        warnings,
        () => state.connection.getTableProperties(entity.name, target),
      );
    }
    if (primaryKeys.length > 0) {
      for (const column of columns) {
        column.primaryKey = primaryKeys.includes(column.name);
      }
    }

    const createScript = await attempt(
      "Could not read the create script",
      warnings,
      async () => {
        if (entity.entityType === "table") {
          return state.connection.getTableCreateScript(entity.name, target);
        }
        const lines =
          entity.entityType === "view"
            ? await state.connection.getViewCreateScript(entity.name, target)
            : await state.connection.getMaterializedViewCreateScript(
              entity.name,
              target,
            );
        return (lines || []).join("\n");
      },
    );

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
    };
  }

  async runQuery(
    params: QueryParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<QueryResult> {
    const client = clientInfo(context.request?.client);
    if (!params.sql || !params.sql.trim()) {
      throw new CliError("USAGE", "No SQL was given to run.");
    }
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    const disallowed = disallowedStatements(
      params.sql,
      state.connection.dialect,
      access.queryTypes,
    );
    if (disallowed.length > 0) {
      const needs = [...new Set(disallowed.flatMap((s) => s.needs))];
      throw new CliError(
        "NOT_PERMITTED",
        `${client.name} is not allowed to run ${needs.join(", ")} statements on this connection.`,
        { hint: CHANGE_ACCESS_HINT, details: { statements: disallowed } },
      );
    }
    const canWrite = access.queryTypes.some((type) =>
      WRITE_QUERY_PERMISSIONS.includes(type),
    );
    let results: NgQueryResult[];
    try {
      // A state.connection that may only read also gets the database state.connection's own
      // read only check. arrayMode (postgres, sqlite) and rowsAsArray (mysql)
      // keep duplicate column names apart; clients that don't know them ignore them.
      results = await state.connection.executeQuery(params.sql, {
        forceReadOnly: !canWrite,
        arrayMode: true,
        rowsAsArray: true,
      });
    } catch (error) {
      const message: string = error?.message ?? String(error);
      if (message === clientErrorMessages.readOnly) {
        if (state.connection.readOnlyMode) {
          throw new CliError(
            "READ_ONLY",
            "This connection is in read only mode, so the statement was rejected.",
            {
              hint: READ_ONLY_HINT,
            },
          );
        }
        throw new CliError(
          "NOT_PERMITTED",
          `${client.name} may only read on this connection.`,
          {
            hint: CHANGE_ACCESS_HINT,
          },
        );
      }
      throw new CliError("QUERY_FAILED", message, {
        details: _.omitBy(
          {
            code: error?.code,
            detail: error?.detail,
            hint: error?.hint,
            position: error?.position,
          },
          _.isNil,
        ),
      });
    }
    return { results: (results || []).map(formatQueryResult) };
  }

  async openTab(
    params: OpenTabParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<OpenTabResult> {
    const client = clientInfo(context.request?.client);
    const tab = params.tab;
    if (!(TAB_TYPES as readonly string[]).includes(tab)) {
      throw new CliError("USAGE", `Unknown tab type "${tab}".`, {
        hint: `Tab types: ${TAB_TYPES.join(", ")}.`,
      });
    }
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "openTabs", context);
    const request: CreateTabRequest = { tab, sql: params.sql };
    const tabId = await this.askRendererToCreateTab(state, request);
    return { tabId };
  }

  async switchTab(
    params: SwitchTabParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<void> {
    const client = clientInfo(context.request?.client);
    if (!params.tabId) {
      throw new CliError("USAGE", "switch-tab needs the id of a tab.");
    }
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "openTabs", context);
    await this.askRendererToSwitchTab(state, params.tabId);
  }

  async getSavedQueries(
    params: SavedQueriesParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<SavedQueriesResult> {
    const client = clientInfo(context.request?.client);
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "savedQueriesRead", context);
    const queries = await FavoriteQuery.find({ order: { title: "ASC" } });
    return { savedQueries: queries.map(toSavedQuerySummary) };
  }

  async getSavedQuery(
    params: SavedQueryParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<SavedQueryResult> {
    const client = clientInfo(context.request?.client);
    const id = this.savedQueryId(params.id);
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "savedQueriesRead", context);
    return { savedQuery: await this.loadSavedQuery(id) };
  }

  async createSavedQuery(
    params: CreateSavedQueryParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<SavedQueryResult> {
    const client = clientInfo(context.request?.client);
    const title = params.title?.trim();
    if (!title) {
      throw new CliError("USAGE", "A saved query needs a title.");
    }
    if (!params.text?.trim()) {
      throw new CliError("USAGE", "A saved query needs SQL text.");
    }
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "savedQueriesWrite", context);
    const query = new FavoriteQuery().withProps({
      title,
      text: params.text,
      excerpt: params.text.slice(0, EXCERPT_LENGTH),
      database: state.database,
    });
    await query.save();
    this.notifySavedQueryChanged(state, query.id);
    return { savedQuery: await this.loadSavedQuery(query.id) };
  }

  async updateSavedQuery(
    params: UpdateSavedQueryParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<SavedQueryResult> {
    const client = clientInfo(context.request?.client);
    const id = this.savedQueryId(params.id);
    const title = params.title?.trim();
    if (params.title !== undefined && !title) {
      throw new CliError("USAGE", "A saved query title cannot be empty.");
    }
    if (params.text !== undefined && !params.text.trim()) {
      throw new CliError("USAGE", "A saved query cannot be emptied.");
    }
    if (title === undefined && params.text === undefined) {
      throw new CliError(
        "USAGE",
        "Nothing to update: pass a new title, new SQL, or both.",
      );
    }
    const state = await this.findState(context, params.connection);
    const access = state.cliClients.get(client.name).access;
    this.require(access, "savedQueriesWrite", context);
    const query = await this.findSavedQuery(id);
    if (title !== undefined) {
      query.title = title;
    }
    if (params.text !== undefined) {
      query.text = params.text;
      query.excerpt = params.text.slice(0, EXCERPT_LENGTH);
    }
    await query.save();
    this.notifySavedQueryChanged(state, id);
    return { savedQuery: await this.loadSavedQuery(id) };
  }

  /** Shows the approval dialog, unless the client is already approved for the connection. */
  async requestApproval(
    params: RequestApprovalParams,
    context: CallContext = NO_CONTEXT,
  ): Promise<RequestApprovalResult> {
    const client = clientInfo(context.request?.client);
    const selected = await this.selectConnection(context, params.connection);
    const connectionState = state(selected.id);
    const clientName = client.name;
    const existing = connectionState.cliClients.get(clientName)?.access;
    if (existing) {
      return { newlyApproved: false, access: existing };
    }
    const key = `${selected.id}\0${clientName}`;
    let dialog = this.pendingApprovals.get(key);
    if (!dialog) {
      const cancel = new AbortController();
      const request = {
        clientName,
        connectionName: selected.name,
        readOnlyMode: selected.readOnlyMode,
      };
      const answer = this.askRendererForAccess(
        connectionState,
        request,
        cancel.signal,
      )
        .then(async (access) => {
          if (!access || cancel.signal.aborted) {
            return null;
          }
          // The renderer's answer may hold unknown permissions, or write
          // permissions on a read only connection.
          const queryTypes = (access.queryTypes || []).filter((type) => {
            if (!(QUERY_PERMISSIONS as readonly string[]).includes(type)) {
              return false;
            }
            return !(
              selected.readOnlyMode &&
              WRITE_QUERY_PERMISSIONS.includes(type)
            );
          });
          const granted: Access = {
            queryTypes: [...new Set(queryTypes)],
            savedQueriesRead: !!access.savedQueriesRead,
            savedQueriesWrite: !!access.savedQueriesWrite,
            openTabs: !!access.openTabs,
          };
          connectionState.cliClients.set(
            clientName,
            new AuthorizedClient(clientName, granted),
          );
          connectionState.port?.postMessage({
            type: "cli/grantsChanged",
            input: {},
          });
          return granted;
        })
        .finally(() => this.pendingApprovals.delete(key));
      dialog = { answer, cancel, waiting: 0 };
      this.pendingApprovals.set(key, dialog);
    }
    const access = await this.waitForApproval(dialog, context.signal);
    if (!access) {
      throw new CliError(
        "ACCESS_DENIED",
        `Access to "${selected.name}" was denied for ${clientName}.`,
        {
          hint: "Run `bks request-approval` again to ask again.",
        },
      );
    }
    return { newlyApproved: true, access };
  }

  /** Waits for the dialog's answer, and closes the dialog once every caller has hung up. */
  private async waitForApproval(
    dialog: PendingApproval,
    signal: AbortSignal,
  ): Promise<Access | null> {
    dialog.waiting += 1;
    let onAbort: () => void = () => undefined;
    const hungUp = new Promise<never>((_resolve, reject) => {
      onAbort = () =>
        reject(
          new CliError(
            "INTERNAL",
            "The caller hung up before the dialog was answered.",
          ),
        );
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
    try {
      return await Promise.race([dialog.answer, hungUp]);
    } finally {
      signal.removeEventListener("abort", onAbort);
      dialog.waiting -= 1;
      if (dialog.waiting === 0 && signal.aborted) {
        dialog.cancel.abort();
      }
    }
  }

  private savedQueryId(raw: unknown): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 1) {
      throw new CliError("USAGE", `"${raw}" is not a saved query id.`, {
        hint: "Run `saved-queries list` to see the ids.",
      });
    }
    return id;
  }

  private async findSavedQuery(id: number): Promise<FavoriteQuery> {
    // text is not selected by default.
    const query = await FavoriteQuery.createQueryBuilder("q")
      .addSelect("q.text")
      .where("q.id = :id", { id })
      .getOne();
    if (!query) {
      throw new CliError("NOT_FOUND", `No saved query with id ${id}.`, {
        hint: "Run `saved-queries list` to see the ids.",
      });
    }
    return query;
  }

  private async loadSavedQuery(id: number): Promise<SavedQuery> {
    const query = await this.findSavedQuery(id);
    return { ...toSavedQuerySummary(query), text: query.text };
  }

  /** Lets the window refresh its saved query list. */
  protected notifySavedQueryChanged(connectionState: State, id: number): void {
    connectionState.port?.postMessage({
      type: "cli/savedQueryChanged",
      input: { id },
    });
  }

  private require(
    access: Access,
    permission: Permission,
    context: CallContext,
  ): void {
    const client = clientInfo(context.request?.client);
    if (!access[permission]) {
      throw new CliError(
        "NOT_PERMITTED",
        `${client.name} is not allowed to ${PERMISSION_LABELS[permission]} on this connection.`,
        { hint: CHANGE_ACCESS_HINT },
      );
    }
  }

  /** Shows the approval dialog in the connection's window. Resolves null when the user denies. */
  protected async askRendererForAccess(
    connectionState: State,
    request: ApprovalRequester,
    signal: AbortSignal,
  ): Promise<Access | null> {
    try {
      return await this.askRenderer(
        connectionState,
        "cli/requestApproval",
        { ...request },
        signal,
      );
    } catch (error) {
      if (signal.aborted || error.code === "ACCESS_DENIED") {
        return null;
      }
      throw error;
    }
  }

  protected async askRendererToCreateTab(
    connectionState: State,
    request: CreateTabRequest,
  ): Promise<number> {
    return await this.askRenderer(connectionState, "cli/createTab", {
      ...request,
    });
  }

  protected async askRendererToSwitchTab(
    connectionState: State,
    tabId: number,
  ): Promise<void> {
    await this.askRenderer(connectionState, "cli/switchTab", { tabId });
  }

  /** The open connection the params name (or the only candidate), once the client is approved for it. */
  private async findState(
    context: CallContext,
    requested?: string,
  ): Promise<State> {
    const client = clientInfo(context.request?.client);
    const selected = await this.selectConnection(context, requested);
    const connectionState = state(selected.id);
    if (!connectionState.cliClients.has(client.name)) {
      throw new CliError(
        "NOT_APPROVED",
        `${client.name} is not approved to use this connection.`,
        {
          hint: `Run \`bks request-approval --connection "${selected.name}"\`, then approve it in Beekeeper Studio.`,
        },
      );
    }
    return connectionState;
  }

  private async listTables(
    client: BasicDatabaseClient,
    filter: { schema: string | null },
  ): Promise<Entity[]> {
    const tables = await client.listTables(filter);
    return tables.map((t) => toEntity(t, "table"));
  }

  private async listViews(
    client: BasicDatabaseClient,
    filter: { schema: string | null },
  ): Promise<Entity[]> {
    const views = await client.listViews(filter);
    return views.map((v) => toEntity(v, "view"));
  }

  private async listMaterializedViews(
    client: BasicDatabaseClient,
    filter: { schema: string | null },
  ): Promise<Entity[]> {
    const materializedViews = await client.listMaterializedViews(filter);
    return materializedViews.map((v) => toEntity(v, "materialized-view"));
  }

  private async listRoutines(
    client: BasicDatabaseClient,
    filter: { schema: string | null },
  ): Promise<Entity[]> {
    const routines = await client.listRoutines(filter);
    return routines.map((r) => ({
      ...toEntity(r, "routine"),
      routineType: r.type,
      returnType: r.returnType,
    }));
  }

  private async findEntity(
    client: BasicDatabaseClient<any, any>,
    name: string,
    schema: string | undefined,
  ): Promise<{ entity: Entity; warnings: string[] }> {
    const warnings: string[] = [];
    const filter = { schema: schema ?? null };
    const loaded: Entity[] = [];
    const tables = await attempt("Could not list tables", warnings, () =>
      this.listTables(client, filter),
    );
    if (tables) {
      loaded.push(...tables);
    }
    const views = await attempt("Could not list views", warnings, () =>
      this.listViews(client, filter),
    );
    if (views) {
      loaded.push(...views);
    }
    const materializedViews = await attempt(
      "Could not list materialized-views",
      warnings,
      () => this.listMaterializedViews(client, filter),
    );
    if (materializedViews) {
      loaded.push(...materializedViews);
    }
    // Not every client honours filter.schema, so filter here as well. Entities
    // without a schema (sqlite, mysql) are kept.
    const all = schema
      ? loaded.filter((e) => !e.schema || e.schema === schema)
      : loaded;

    let matches = all.filter((e) => e.name === name);
    if (matches.length === 0) {
      const lowered = name.toLowerCase();
      matches = all.filter((e) => e.name.toLowerCase() === lowered);
    }
    if (matches.length === 0) {
      const where = schema ? ` in schema "${schema}"` : "";
      throw new CliError(
        "NOT_FOUND",
        `No table or view named "${name}"${where}.`,
        {
          hint: "Run `entities` to see the available names.",
        },
      );
    }
    if (matches.length > 1) {
      const schemas = _.uniq(matches.map((e) => e.schema || "(none)"));
      throw new CliError(
        "AMBIGUOUS_ENTITY",
        `"${name}" exists in more than one schema: ${schemas.join(", ")}.`,
        { hint: "Pass --schema <schema> to pick one." },
      );
    }

    return { entity: matches[0], warnings };
  }

  private async selectConnection(
    context: CallContext,
    requested: string | undefined,
  ): Promise<OpenConnection> {
    const result = await this.getConnections({}, context);
    const all = result.connections;
    const details = { connections: all };
    const openNames = all.map((item) => `"${item.name}"`).join(", ");

    if (all.length === 0) {
      throw new CliError(
        "NO_OPEN_CONNECTIONS",
        "No database connection is open in Beekeeper Studio.",
        {
          hint: "Connect to a database in the Beekeeper Studio app, then run the command again.",
        },
      );
    }

    if (requested) {
      const needle = requested.trim().toLowerCase();
      const matches = all.filter(
        (item) =>
          item.id === requested.trim() ||
          item.name.toLowerCase() === needle,
      );
      if (matches.length === 0) {
        throw new CliError(
          "UNKNOWN_CONNECTION",
          `No open connection is named "${requested}".`,
          {
            hint: `Open connections: ${openNames}. Run \`connections\` to list them with their ids.`,
            details,
          },
        );
      }
      if (matches.length > 1) {
        throw new CliError(
          "AMBIGUOUS_CONNECTION",
          `${matches.length} open connections are named "${requested}".`,
          {
            hint: "Pass --connection <id> instead. Run `connections` to see the ids.",
            details,
          },
        );
      }
      return matches[0];
    }

    if (all.length === 1) {
      return all[0];
    }
    // With several open, the one this client is already approved for is the obvious pick.
    const approved = all.filter((item) => item.approved);
    if (approved.length === 1) {
      return approved[0];
    }
    throw new CliError(
      "AMBIGUOUS_CONNECTION",
      `${all.length} connections are open: ${openNames}.`,
      { hint: "Pass --connection <name> to pick one.", details },
    );
  }

  /** Calls a handler the renderer registered, see UtilityConnection.register. */
  private async askRenderer<K extends keyof RendererMethods>(
    connectionState: State,
    name: K,
    args: Parameters<RendererMethods[K]>[0],
    signal?: AbortSignal,
  ): Promise<Awaited<ReturnType<RendererMethods[K]>>> {
    const client = connectionState?.rendererClient;
    if (!client) {
      throw new CliError(
        "INTERNAL",
        "The window that owns this connection is not reachable.",
      );
    }
    try {
      return await client.request(name, args, { signal });
    } catch (error) {
      const code = error.code ?? "INTERNAL";
      throw new CliError(code, error.message);
    }
  }
}
