import { AnyAuth, ConnectionStatus, RecordId, Token } from "surrealdb";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, CancelableQuery, BksFieldType, TableChanges, TableUpdateResult, TableInsert } from "@/lib/db/models";
import { TableKey } from "@/shared/lib/dialects/models";
import { _baseTest } from "@playwright/test";
import { DatabaseElement, IDbConnectionDatabase, SurrealAuthType } from "@/lib/db/types";
import rawLog from '@bksLogger';
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { SurrealDBRecordTranscoder, Transcoder } from "@/lib/db/serialization/transcoders";
import { SurrealDBCursor } from "./surrealdb/SurrealDBCursor";
import { ChangeBuilderBase } from "@/shared/lib/sql/change_builder/ChangeBuilderBase";
import { SurrealConn, SurrealPool } from "./surrealdb/SurrealDBPool";

const log = rawLog.scope('SurrealDB');

// NOTE (@day): The structure clause that we receive this info from was originally internal,
// and as such, is subject to change without notification. So if things break, look into this structure (This goes for any query that ends in `STRUCTURE`). But it was either that
// or parse define statements with sketchy regex
export interface SurrealFieldInfo {
  flex: boolean, // not sure what this is for, I think flexible schema?
  kind: string, // type
  name: string,
  permissions: {
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

// TODO (@day): are both of these necessary?
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
      namespace: this.server.config.surrealDbOptions.namespace,
      database: this.db,
      auth: config,
      reconnect: true
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
      host,
      port,
      user,
      password,
      surrealDbOptions
    } = this.server.config;

    const protocol = surrealDbOptions?.protocol || 'wss';
    this.connectionString = `${protocol}://${host || 'localhost'}:${port || 8000}/rpc`;

    switch (surrealDbOptions.authType) {
      case SurrealAuthType.Root:
        return {
          username: user,
          password
        };
      case SurrealAuthType.Namespace:
        return {
          namespace: surrealDbOptions.namespace,
          username: user,
          password
        };
      case SurrealAuthType.Database:
        return {
          namespace: surrealDbOptions.namespace,
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
      transactions: false
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
      // TODO (@day): this only works for schemafull tables
      // get general info for table
      const result = await this.driverExecuteSingle(`INFO FOR TABLE ${table} STRUCTURE`);
      const tableFields = result?.rows[0]?.fields as SurrealFieldInfo[];
      let ordinalPosition = 1;
      const parentFields = [];

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
      return {
        id: indexInfo.name,
        table,
        name: indexInfo.name,
        columns,
        unique: !!indexInfo.unique
      } as TableIndex
    })
  }

  // TODO (@day): perhaps we should use this for namespaces
  async listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return [];
  }

  // we don't seem to use this anywhere
  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return [];
  }

  async getTableKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const columns = await this.listTableColumns(table);
    const keys: TableKey[] = [];

    for (const col of columns) {
      const match = col.dataType.match(/\brecord\s*<\s*([a-z0-9_,\s]+)\s*>/i);
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
    const results = options.multiple
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

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const result = await this.driverExecuteSingle('INFO FOR NS STRUCTURE');
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
    log.info('SQL: ', sql)
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
          return `${escapedField} ${filter.type} ${filter.value}`;
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
      throw new Error("Method not implemented.");
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
      })
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

  executeApplyChanges(changes: TableChanges): Promise<TableUpdateResult[]> {
    throw new Error("Method not implemented.");
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

  protected async rawExecuteQuery(q: string, options: { multiple: boolean, connection?: SurrealConn}): Promise<SurrealDBQueryResult | SurrealDBQueryResult[]> {
    try {
      const conn = options?.connection ? options.connection : await this.pool.connect();
      const result = await conn.query(q);

      const results = result.map((queryResult) => {
        const rows = Array.isArray(queryResult) ? queryResult : [queryResult];

        // TODO (@day): this isn't reliable at all
        const columns = rows.length > 0
          ? Object.keys(rows[0]).map(name => ({ name }))
          : [];

        return {
          rows,
          columns,
          arrayMode: false
        }
      });

      if (!options.connection) {
        conn.release();
      }

      return options.multiple ? results : results[0];
    } catch (err) {
      log.error('ERROR running query: ', err);
      throw err;
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

  private async insertRows(inserts: TableInsert[]) {
    for (const insert of inserts) {
      for (const d in insert.data) {
        const data = Object.entries(d).map(([fieldName, fieldData]) => {
          return `${this.wrapIdentifier(fieldName)} = ${fieldData}`
        })

        const query = `
          CREATE ${insert.table} SET
            ${data.join(',\n')};
        `;

        await this.driverExecuteSingle(query)
      }
    }
  }

}
