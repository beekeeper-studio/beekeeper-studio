import { AnyAuth, ConnectionStatus, RecordId, StringRecordId, Token } from "surrealdb";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, CancelableQuery, BksFieldType, TableChanges, TableUpdateResult, TableInsert, TableUpdate, TableDelete } from "@/lib/db/models";
import { TableKey } from "@/shared/lib/dialects/models";
import { _baseTest } from "@playwright/test";
import { DatabaseElement, IDbConnectionDatabase, SurrealAuthType } from "@/lib/db/types";
import rawLog from '@bksLogger';
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { SurrealDBRecordTranscoder, Transcoder } from "@/lib/db/serialization/transcoders";
import { SurrealDBCursor } from "./surrealdb/SurrealDBCursor";
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { SurrealDBChangeBuilder } from "@/shared/lib/sql/change_builder/SurrealDBChangeBuilder";
import { SurrealConn, SurrealPool } from "./surrealdb/SurrealDBPool";
import _ from "lodash";
import { surrealEscapeValue } from "@/shared/lib/dialects/surrealdb";
import { uuidv4 } from "@/lib/uuid";

const log = rawLog.scope('SurrealDB');

// NOTE (@day): The structure clause that we receive this info from was originally internal,
// and as such, is subject to change without notification. So if things break, look into this structure (This goes for any query that ends in `STRUCTURE`). But it was either that
// or parse define statements with sketchy regex
export interface SurrealFieldInfo {
  flex: boolean,
  kind: string, // type
  name: string,
  permissions?: {
    create: boolean,
    delete: boolean,
    select: boolean,
    update: boolean
  },
  readonly: boolean,
  default: string, // default value on insert
  value: string, // set every time an update is made to the record
  what: string // the table this is on
}

export interface SurrealDBFunctionInfo {
  args: any[][],
  block: string,
  name: string,
  permissions: boolean
}

export interface SurrealDBResult {
  result: any[];
  status: string;
  time: string;
}

export interface SurrealDBQueryResult {
  rows: any[];
  columns: { name: string }[];
  arrayMode: boolean;
}

const surrealContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null
  }
}

export class SurrealDBClient extends BasicDatabaseClient<SurrealDBQueryResult> {
  version: SurrealDBResult;
  pool: SurrealPool;
  connectionString: string;
  transcoders: Transcoder<any, any>[] = [SurrealDBRecordTranscoder];

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, surrealContext, server, database);

    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect(): Promise<void> {
    await super.connect();

    const config = this.configDatabase();
    log.info('CONNECTION STRING: ', this.connectionString);
    log.info('DATABASE: ', this.db)

    // TODO (@day): possibly temporary. We may want to make it so that namespaces essentially function like databases, and databases function like schemata in postgres
    this.pool = new SurrealPool(this.connectionString, {
      namespace: this.database.namespace,
      database: this.db,
      auth: config,
      reconnect: true,
      versionCheck: false
    });

    // Test the pool
    const conn = await this.pool.connect();
    if (conn.status === ConnectionStatus.Disconnected || conn.status === ConnectionStatus.Error) {
      throw new Error('Error connecting to database');
    }

    await conn.release()
  }

  configDatabase(): AnyAuth | Token {
    const {
      user,
      password,
      surrealDbOptions
    } = this.server.config;
    const { namespace } = this.database;

    let host = this.server.config.host;
    let port = this.server.config.port;

    if (this.server.sshTunnel) {
      host = this.server.config.localHost;
      port = this.server.config.localPort;
    }

    const portString = port ? `:${port}` : '';
    const protocol = surrealDbOptions?.protocol || 'wss';
    this.connectionString = `${protocol}://${host || 'localhost'}${portString}/rpc`;

    switch (surrealDbOptions.authType) {
      case SurrealAuthType.Root:
        return {
          username: user,
          password
        };
      case SurrealAuthType.Namespace:
        return {
          namespace,
          username: user,
          password
        };
      case SurrealAuthType.Database:
        return {
          namespace,
          database: this.db,
          username: user,
          password
        };
      case SurrealAuthType.RecordAccess:
        throw new Error('Authentication method not implemented');
      case SurrealAuthType.Token:
        return surrealDbOptions.token;
      case SurrealAuthType.Anonymous:
        return undefined;
      default:
        return undefined
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.disconnect();
      }
    } catch (err) {
      log.error('Error disconnecting from SurrealDB:', err);
    }
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: false,
      filterTypes: ['standard']
    };
  }

  async versionString(): Promise<string> {
    const conn = await this.pool.connect();
    try {
      const result = await conn.version();
      return result || 'Unknown';
    } catch (error) {
      log.error('Failed to get version: ', error);
    } finally {
      conn.release();
    }
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    const result = await this.driverExecuteSingle('INFO FOR DB STRUCTURE;');

    const tables = result.rows[0]?.tables;

    return tables.map((tableInfo) => ({
      name: tableInfo.name,
      entityType: 'table',
      tableType: tableInfo.kind.kind
    }))
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    // SurrealDB doesn't really have views
    return [];
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    const result = await this.driverExecuteSingle('INFO FOR DB STRUCTURE;');

    const functions = result.rows[0]?.functions as SurrealDBFunctionInfo[];

    return functions.map((func) => {
      const args = func.args[0]?.map((a) => ({
        name: a,
        type: 'any'
      })) || [];

      return {
        id: func.name,
        name: func.name,
        entityType: 'routine',
        type: 'function',
        returnType: 'any',
        routineParams: args
      }
    })
  }

  async listMaterializedViewColumns(_table: string, _schema?: string): Promise<TableColumn[]> {
    return [];
  }

  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    if (!table) {
      const tables = await this.listTables();
      const allColumns: ExtendedTableColumn[] = [];

      for (const t of tables) {
        const columns = await this.listTableColumns(t.name);
        allColumns.push(...columns);
      }

      return allColumns;
    }

    try {
      // get general info for table
      const result = await this.driverExecuteSingle(`INFO FOR TABLE ${table} STRUCTURE`);
      const tableFields = result?.rows[0]?.fields as SurrealFieldInfo[] || [];
      let ordinalPosition = 1;
      const parentFields = [];

      // This means it's a schemaless table, so we'll have to guess
      if (!tableFields || tableFields.length == 0) {
        const results = await this.driverExecuteSingle(`SELECT * FROM ${table} LIMIT 10`);
        const existingFields = new Set<string>();
        results.rows.forEach((row) => {
          Object.entries(row).forEach(([field, value]) => {
            let type: string = typeof value;

            if (_.isArray(value)) {
              type = 'array'
            }

            if (value instanceof RecordId) {
              if (value.tb === table) {
                type = 'string'
              } else {
                type = `record<${value.tb}>`
              }
            }

            if (!existingFields.has(field)) {
              existingFields.add(field);
              tableFields.push({
                flex: false,
                kind: type,
                name: field,
                readonly: false,
                default: null,
                value: null,
                what: table
              });
            } else {
              const fieldIndex = tableFields.findIndex((v) => v.name == field);
              if (tableFields[fieldIndex].kind != type) {
                tableFields[fieldIndex].kind = 'any';
              }
            }
          })
        })
      }

      return tableFields.map((fieldInfo: SurrealFieldInfo) => {
        if (fieldInfo.kind.startsWith('array<') || fieldInfo.kind.startsWith('object')) {
          parentFields.push(fieldInfo.name)
        }
        const isObjectOrArrayChild = parentFields.some((v) => {
          return fieldInfo.name.startsWith(`${v}.`) ||
            fieldInfo.name.startsWith(`${v}[*]`);
        });
        if (isObjectOrArrayChild) {
          // These are just typings for subobjects, which we don't currently support returning
          // metadata for, so we just skip them
          return null;
        }

        return {
          tableName: table,
          columnName: fieldInfo.name,
          dataType: fieldInfo.kind,
          defaultValue: fieldInfo.default,
          ordinalPosition: ordinalPosition++,
          hasDefault: !!fieldInfo.default,
          generated: false,
          bksField: this.parseTableColumn(fieldInfo)
        } as ExtendedTableColumn;
      }).filter((v) => !!v)
    } catch (err) {
      log.error(`Error extracting table columns for ${table}`, err);
      throw err;
    }
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return []
  }

  async listTableIndexes(table: string, _schema?: string): Promise<TableIndex[]> {

    const result = await this.driverExecuteSingle(`INFO FOR TABLE ${table} STRUCTURE`);
    const tableIndexes = result?.rows[0]?.indexes as any[];

    return tableIndexes.map((indexInfo) => {
      const columns = indexInfo.cols.split(',').map((name) => ({ name }));
      const unique = indexInfo.index === 'UNIQUE';
      return {
        id: indexInfo.name,
        table,
        name: indexInfo.name,
        columns,
        unique
      } as TableIndex
    })
  }

  // NOTE (@day): this is only really available for root users, so we will restrict it as such
  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle(`INFO FOR ROOT STRUCTURE`);
    const namespaces = result?.rows[0]?.namespaces as any[];

    return namespaces.map((namespace) => namespace.name);
  }

  // we don't seem to use this anywhere
  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getOutgoingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const columns = await this.listTableColumns(table);
    const keys: TableKey[] = [];

    for (const col of columns) {
      const match = col.dataType.match(/^\brecord\s*<\s*([a-z0-9_,\s]+)\s*>/i);
      if (match) {
        const targetTables = match[1]
          .split(',')
          .map(t => t.trim());

        for (const toTable of targetTables) {
          keys.push({
            constraintName: `${table}_${col.columnName}_fkey`,
            fromTable: table,
            fromColumn: col.columnName,
            fromSchema: '',
            toTable,
            toColumn: 'id',
            toSchema: '',
            onDelete: null, // TODO (@day): pull this from table info definitions
            onUpdate: null,
            isComposite: targetTables.length > 1
          })
        }
      }
    }

    return keys;
  }

  async getIncomingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const keys: TableKey[] = [];

    // Get list of all tables
    const tables = await this.listTables();

    // Create a map of table name to columns for quick lookup
    const tableColumnsMap = new Map<string, { columnName: string; dataType: string }[]>();

    for (const { name } of tables) {
      const columns = await this.listTableColumns(name);
      const columnData = columns.map(col => ({
        columnName: col.columnName,
        dataType: col.dataType
      }));
      tableColumnsMap.set(name, columnData);
    }

    const buildKey = (params: {
      toTable: string;
      fromTable: string;
      column: { columnName: string; dataType: string };
      isComposite: boolean;
    }) => {
      return {
        constraintName: `${params.fromTable}_${params.column.columnName}_fkey`,
        fromTable: params.fromTable,
        fromColumn: params.column.columnName,
        fromSchema: '',
        toTable: params.toTable,
        toColumn: 'id',
        toSchema: '',
        onDelete: null, // TODO (@day): pull this from table info definitions
        onUpdate: null,
        isComposite: params.isComposite,
      }
    }

    // Incoming keys: columns in OTHER tables that reference THIS table
    for (const [otherTableName, otherColumns] of tableColumnsMap.entries()) {
      // Skip the current table
      if (otherTableName === table) continue;

      for (const column of otherColumns) {
        const match = column.dataType.match(/^\brecord\s*<\s*([a-z0-9_,\s]+)\s*>/i);
        if (match) {
          const targetTables = match[1]
            .split(',')
            .map(t => t.trim());

          // Check if any of the target tables is the current table
          if (targetTables.includes(table)) {
            keys.push(buildKey({
              fromTable: otherTableName,
              toTable: table,
              column,
              isComposite: targetTables.length > 1,
            }));
          }
        }
      }
    }

    return keys;
  }
  async query(queryText: string, options?: any): Promise<CancelableQuery> {
    return {
      execute: async(): Promise<NgQueryResult[]> => {
        return await this.executeQuery(queryText, options)
      },
      async cancel() {
        log.warn('SurrealDB does not currently support cancelling queries');
      }
    }
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const results = options?.multiple || false
      ? await this.driverExecuteMultiple(queryText, options)
      : [await this.driverExecuteSingle(queryText, options)];

    return results.map(result => ({
      command: queryText.trim().split(' ')[0].toUpperCase(),
      rows: result.rows,
      fields: result.columns.map(col => ({ name: col.name, id: col.name })),
      rowCount: result.rows.length,
      affectedRows: result.rows.length
    }));
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    let result: SurrealDBQueryResult;

    if (filter && filter.namespace) {
      const results = await this.driverExecuteMultiple(`
        USE NS ${filter.namespace};
        INFO FOR NS STRUCTURE;
      `);
      if (results && results.length === 2) {
        result = results[1];
      } else {
        return [];
      }
    } else {
      result = await this.driverExecuteSingle('INFO FOR NS STRUCTURE');
    }

    const nsInfo = result.rows[0];

    if (nsInfo && nsInfo.databases) {
      return nsInfo.databases.map((db) => db.name);
    }

    return [];
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties | null> {
    const [
      length,
      indexes,
      relations
    ] = await Promise.all([
      this.getTableLength(table),
      this.listTableIndexes(table),
      this.getTableKeys(table)
    ]);

    return {
      size: length,
      indexes,
      relations,
      triggers: []
    }
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async getPrimaryKey(_table: string, _schema?: string): Promise<string | null> {
    return 'id';
  }

  async getPrimaryKeys(_table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    return [{
      columnName: 'id',
      position: 1
    }]
  }

  async listCharsets(): Promise<string[]> {
    return [];
  }

  async getDefaultCharset(): Promise<string> {
    return 'UTF-8'
  }

  async listCollations(_charset: string): Promise<string[]> {
    return [];
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    try {
      const result = await this.driverExecuteSingle(`SELECT count() FROM ${table} GROUP ALL`);
      return result.rows?.[0]?.count || 0;
    } catch (err) {
      log.error('Failed to get table length: ', err);
      return 0;
    }

  }

  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<TableResult> {
    const sql = await this.selectTopSql(table, offset, limit, orderBy, filters, _schema, selects);
    const result = await this.driverExecuteSingle(sql);
    const fields = this.parseQueryResultColumns(result);
    const rows = await this.serializeQueryResult(result, fields);

    return { result: rows, fields }
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], _schema?: string, selects?: string[]): Promise<string> {
    const escapedTable = this.wrapIdentifier(table);
    const selectFields = selects
      ? selects.map(field => this.wrapIdentifier(field)).join(', ')
      : '*';

    let query = `SELECT ${selectFields} FROM ${escapedTable}`;

    if (filters && filters.length > 0) {
      if (typeof filters === 'string') {
        query += ` WHERE ${filters}`;
      } else {
        const filterClauses = filters.map(filter => {
          const escapedField = this.wrapIdentifier(filter.field);
          if (filter.type === 'in' && _.isArray(filter.value)) {
            const values = filter.value.map((v) => {
              return surrealEscapeValue(v);
            })
            return `${escapedField} ${filter.type.toUpperCase()} [${values.join(',')}]`
          } else if (filter.type === 'is') {
            return `${escapedField} ${filter.type.toUpperCase()} NULL`;
          } else {
            const escapedValue = surrealEscapeValue(filter.value);
            return `${escapedField} ${filter.type} ${escapedValue}`;
          }
        });
        query += ` WHERE ${filterClauses.join(' AND ')}`;
      }
    }

    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(order => {
        const escapedField = this.wrapIdentifier(order.field);
        return `${escapedField} ${order.dir?.toUpperCase() || 'ASC'}`;
      });
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
      if (offset) {
        query += ` START ${offset}`;
      }
    }

    return query;
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    const sql = await this.selectTopSql(table, 0, 0, orderBy, filters, schema);
    const totalRows = await this.getTableLength(table, schema);
    const columns = await this.listTableColumns(table, schema);

    const cursor = new SurrealDBCursor({
      query: sql,
      conn: this.pool,
      chunkSize
    });

    return {
      totalRows,
      columns,
      cursor
    };
  }

  async queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    // For query streaming, we need to estimate total rows and columns
    // This is a simplified implementation
    const cursor = new SurrealDBCursor({
      query,
      conn: this.pool,
      chunkSize
    });

    // Try to get a sample to determine columns
    let columns: TableColumn[] = [];
    let totalRows = 0;

    try {
      // Execute a small sample to get column info
      const sampleQuery = query.includes('LIMIT') ? query : `${query} LIMIT 1`;
      const sampleResult = await this.driverExecuteSingle(sampleQuery);

      if (sampleResult.columns) {
        columns = sampleResult.columns.map(col => ({
          columnName: col.name,
          dataType: 'unknown',
          tableName: ''
        }));
      }

      // For total rows, we'd need to run a count query, but that's complex
      // for arbitrary queries, so we'll set it to -1 to indicate unknown
      totalRows = -1;
    } catch (error) {
      log.warn('Could not determine columns for query stream:', error);
    }

    return {
      totalRows,
      columns,
      cursor
    };
  }

  // TODO (@day): this may not cover all instances
  wrapIdentifier(value: string): string {
    if (!value || value === '*') return value;

      // Match array indexes like field[0]
      const matched = value.match(/^(.*?)(\[[0-9]+\])$/);
      if (matched) {
        return this.wrapIdentifier(matched[1]) + matched[2];
      }

      // Escape backticks by doubling them, then wrap in backticks
      const escaped = value.replace(/`/g, '``');
      return `\`${escaped}\``;
  }

  getBuilder(table: string, schema?: string): ChangeBuilderBase | Promise<ChangeBuilderBase> {
    return new SurrealDBChangeBuilder(table, schema);
  }

  async createDatabase(databaseName: string, _charset: string, _collation: string): Promise<string> {
    await this.driverExecuteSingle(`DEFINE DATABASE ${databaseName}`);
    return databaseName;
  }

  createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const dbInfo = await this.driverExecuteSingle(`INFO FOR DB`);
    const tableInfo = await this.driverExecuteSingle(`INFO FOR TABLE ${table}`);

    const tableDefine = dbInfo.rows[0]?.tables?.[table];
    const fields = tableInfo.rows[0]?.fields;
    const indexes = tableInfo.rows[0]?.indexes;

    let query = '';

    if (tableDefine) {
      query += `${tableDefine};\n`;
    }

    if (fields) {
      query += Object.values(fields).reduce((q, f) => {
        return `${q}${f};\n`;
      }, '');
    }

    if (indexes) {
      query += Object.values(indexes).reduce((q, i) => {
        return `${q}${i};\n`;
      }, '')
    }

    return query;
  }

  async getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getRoutineCreateScript(routine: string, _type: string, _schema?: string): Promise<string[]> {
    const dbInfo = await this.driverExecuteSingle(`INFO FOR DB`);

    const functions = dbInfo?.rows?.[0]?.functions;

    let funcDef
    if (functions) {
      funcDef = functions[routine];
    }
    return funcDef ? [funcDef] : []
  }

  async executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    let results: TableUpdateResult[] = [];
    const sql = ['BEGIN'];
    let allBindings = {};

    log.debug('Applying changes', changes);
    try {
      if (changes.inserts) {
        const result = await this.insertRows(changes.inserts);
        sql.push(...result.map((r) => r.query));
        allBindings = {
          ...allBindings,
          ...result.map((r) => r.bindings).reduce((p, c) => ({
            ...p,
            ...c
          }), {})
        };
      }

      if (changes.updates) {
        const result = await this.updateValues(changes.updates);
        sql.push(...result.map((r) => r.query));
        allBindings = {
          ...allBindings,
          ...result.map((r) => r.bindings).reduce((p, c) => ({
            ...p,
            ...c
          }), {})
        };
      }

      if (changes.deletes) {
        sql.push(...await this.deleteRows(changes.deletes));
      }

      sql.push('COMMIT');

      await this.driverExecuteSingle(sql.join(';'), { bindings: allBindings });

      if (changes.updates) {
        const queries = changes.updates.map(update => {
          // may need to sanitize this
          return `SELECT * FROM ${update.primaryKeys[0].value}`;
        })

        for (const query of queries) {
          const result = await this.driverExecuteSingle(query);
          if (result.rows[0]) results.push(result.rows[0]);
        }
      }
    } catch (ex) {
      log.error('Query Exception: ', ex);
      throw ex;
    }

    return results;
  }

  setTableDescription(table: string, description: string, schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  dropElement(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  truncateElementSql(elementName: string, typeOfElement: DatabaseElement, schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  truncateAllTables(schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  duplicateTable(tableName: string, duplicateTableName: string, schema?: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  duplicateTableSql(tableName: string, duplicateTableName: string, schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  protected async rawExecuteQuery(q: string, options: { multiple: boolean, connection?: SurrealConn, bindings?: any }): Promise<SurrealDBQueryResult | SurrealDBQueryResult[]> {
    const conn = options?.connection ? options.connection : await this.pool.connect();
    try {
      const bindings = options?.bindings ? options.bindings : {}
      log.info('RUNNING QUERY: ', q)
      log.info('BINDINGS: ', bindings)
      const result = await conn.query(q, bindings);

      const results = result.map((queryResult) => {
        const rows = Array.isArray(queryResult) ? queryResult : [queryResult];

        // TODO (@day): this isn't reliable at all
        const columns = rows && rows.length > 0 && rows[0]
          ? Object.keys(rows[0]).map(name => ({ name }))
          : [];

        return {
          rows,
          columns,
          arrayMode: false
        }
      });


      return options.multiple ? results : results[0];
    } catch (err) {
      log.error('ERROR running query: ', err);
      throw err;
    } finally {
      if (!options.connection) {
        conn.release();
      }
    }
  }

  async runWithConnection<T>(child: (c: SurrealConn) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      return await child(connection);
    } finally {
      await connection.release();
    }
  }

  protected parseTableColumn(column: SurrealFieldInfo): BksField {
    const isRecord = column.kind.startsWith('record<') || column.name === 'id';
    return {
      name: column.name,
      bksType: isRecord ? 'SURREALID' : 'UNKNOWN'
    }
  }

  parseQueryResultColumns(qr: SurrealDBQueryResult): BksField[] {
    const row = qr.rows[0];
    return qr.columns.map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';

      if (row[column.name] instanceof RecordId) {
        bksType = 'SURREALID';
      }
      // TODO (@day): may need to do some analysis here
      return { name: column.name, bksType }
    })
  }

  private normalizeValue(value: string, column?: ExtendedTableColumn) {
    if (column.dataType === 'string' && _.isString(value)) {
      return surrealEscapeValue(value)
    }
    return value;
  }

  private async insertRows(rawInserts: TableInsert[]): Promise<{ query: string, bindings: any }[]> {
    const sql = [];
    const columnsList = await Promise.all(rawInserts.map((insert) => {
      return this.listTableColumns(insert.table);
    }));

    const fixedInserts = rawInserts.map((insert, idx) => {
      const result = { ...insert };
      const columns = columnsList[idx];
      result.data = result.data.map((obj) => {
        return _.mapValues(obj, (value, key) => {
          const column = columns.find((c) => c.columnName === key);
          // if (column.columnName != 'id') {

            // return this.normalizeValue(value, column);
          // }

          return value;
        })
      })
      return result;
    })
    for (const insert of fixedInserts) {
      for (const d of insert.data) {
        log.info('CREATING: ', insert);
        log.info('DATA: ', d)
        let id: string = insert.table;
        if (d['id'] && _.isString(d['id'])) {
          id = new RecordId(insert.table, d['id']).toString();
        } else if (d['id']) {
          id = d['id'].toString();
        }
        log.info('ID: ', id)
        d['id'] = undefined;
        const bindings = {};
        const data = Object.entries(d).map(([fieldName, fieldData]) => {
          const varName = `v_${uuidv4().replace(/-/g, '_')}`;
          bindings[varName] = fieldData
          return `${this.wrapIdentifier(fieldName)} = $${varName}`
        })

        const query = `
          CREATE ${id} SET
            ${data.join(',\n')}
        `;

        sql.push({ query, bindings })
      }
    }

    return sql;
  }

  // TODO (@day): may need to normalize values here
  private async updateValues(updates: TableUpdate[]): Promise<{ query: string, bindings: any}[]> {
    const sql = [];
    for (const update of updates) {
      // TODO (@day): may need to sanitize the id
      // Surreal only has the id for primary keys, so it will always be there
      const varName = `v_${uuidv4().replace(/-/g, '_')}`;
      sql.push({
        query: `
          UPDATE ${update.primaryKeys[0].value} SET
            ${update.column} = $${varName}
        `,
        bindings: {
          [varName]: update.value
        }
      });
    }
    return sql;
  }

  private async deleteRows(deletes: TableDelete[]): Promise<string[]> {
    const sql = [];
    for (const del of deletes) {
      log.debug('DELETING: ', del.primaryKeys[0].value)
      // TODO (@day): we need to sanitize this
      sql.push(`DELETE ${del.primaryKeys[0].value}`)
    }

    return sql;
  }

}
