import { AnyAuth, Surreal, Token } from "surrealdb";
import { BaseV1DatabaseClient } from "@/lib/db/clients/BaseV1DatabaseClient";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, NgQueryResult, DatabaseFilterOptions, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField, CancelableQuery, BksFieldType } from "@/lib/db/models";
import { TableKey } from "@/shared/lib/dialects/models";
import { _baseTest } from "@playwright/test";
import { IDbConnectionDatabase, SurrealAuthType } from "@/lib/db/types";
import rawLog from '@bksLogger';
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import { surrealEscapeValue } from "@/shared/lib/dialects/surrealdb";

const log = rawLog.scope('SurrealDB');

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

export class SurrealDBClient extends BaseV1DatabaseClient<SurrealDBQueryResult> {
  version: SurrealDBResult;
  conn: Surreal;
  connectionString: string;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, surrealContext, server, database);

    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.conn = new Surreal();
  }

  async connect(): Promise<void> {
    await super.connect();

    const config = this.configDatabase();

    log.info('CONNECTION STRING: ', this.connectionString);
    log.info('DATABASE: ', this.db)
    // TODO (@day): possibly temporary. We may want to make it so that namespaces essentially function like databases, and databases function like schemata in postgres
    await this.conn.connect(this.connectionString, {
      namespace: this.server.config.surrealDbOptions.namespace,
      database: this.db,
      auth: config,
      reconnect: true
    });


    await this.conn.ready;
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
      if (this.conn) {
        await this.conn.close();
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
    try {
      const result = await this.conn.version();
      return result || 'Unknown';
    } catch (error) {
      log.error('Failed to get version: ', error);
    }
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    try {
      const result = await this.driverExecuteSingle('INFO FOR DB;');

      const tables = result.rows[0]?.tables;

      if (tables) {
        return Object.keys(tables).map(name => ({ name } as TableOrView))
      }

      return [];
    } catch (error) {
      log.error('Failed to list tables: ', error);
      return [];
    }
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    // SurrealDB doesn't really have views
    return [];
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    const result = await this.driverExecuteSingle('INFO FOR DB;');

    const functions = result.rows[0]?.functions;

    if (functions) {
      return Object.keys(functions).map(id => ({
        id,
        type: 'function'
      } as Routine))
    }

    return [];
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
      const tableFields = result?.rows[0]?.fields as any[];

      return tableFields.map((fieldInfo, index) => {
        return {
          tableName: table,
          columnName: fieldInfo.name,
          dataType: fieldInfo.kind,
          defaultValue: fieldInfo.default,
          ordinalPosition: index + 1,
          hasDefault: !!fieldInfo.default,
          generated: false
        } as ExtendedTableColumn;
      })
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

  async getTableKeys(table: string, schema?: string): Promise<TableKey[]> {
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
          const escapedValue = surrealEscapeValue(filter.value);
          return `${escapedField} ${filter.type === '=' ? '==' : filter.type} ${escapedValue}`;
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

  selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, schema?: string): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  queryStream(query: string, chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.");
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

  protected async rawExecuteQuery(q: string, options: any): Promise<SurrealDBQueryResult | SurrealDBQueryResult[]> {
    try {
      const result = await this.conn.query(q);

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

      return options.multiple ? results : results[0];
    } catch (err) {
      log.error('ERROR running query: ', err);
      throw err;
    }
  }
  protected parseTableColumn(column: any): BksField {
    throw new Error("Method not implemented.");
  }

  parseQueryResultColumns(qr: SurrealDBQueryResult): BksField[] {
    return qr.columns.map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';
      // TODO (@day): may need to do some analysis here
      return { name: column.name, bksType }
    })
  }
}
