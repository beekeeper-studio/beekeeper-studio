import { TableKey } from "@shared/lib/dialects/models";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { SupportedFeatures, FilterOptions, TableOrView, Routine, TableColumn, ExtendedTableColumn, TableTrigger, TableIndex, SchemaFilterOptions, CancelableQuery, NgQueryResult, DatabaseFilterOptions, TableChanges, TableProperties, PrimaryKeyColumn, OrderBy, TableFilter, TableResult, StreamResults, BksField } from "@/lib/db/models";
import { DatabaseElement, IDbConnectionDatabase } from "@/lib/db/types";
import { BasicDatabaseClient, ExecutionContext, QueryLogOptions } from "@/lib/db/clients/BasicDatabaseClient";
import knexlib from 'knex';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CassandraKnex = require('cassandra-knex/dist/cassandra_knex.cjs');
import * as cassandra from 'cassandra-driver';
import { readFileSync } from "fs";
import { CassandraChangeBuilder } from "@shared/lib/sql/change_builder/CassandraChangeBuilder";
import rawLog from "@bksLogger";
import { createCancelablePromise } from "@/common/utils";
import { identify } from "sql-query-identifier";
import { errors } from "@/lib/errors";
import { dataTypesToMatchTypeCode, CassandraData as D } from "@shared/lib/dialects/cassandra";
import { CassandraCursor } from "./cassandra/CassandraCursor";
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import _ from "lodash";

const log = rawLog.scope("cassandra");
const logger = () => log;

const cassandraContext = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(_query: string, _options: QueryLogOptions, _context: ExecutionContext): Promise<number | string> {
    return null;
  }
}

// copied from cass-driver typedefs
interface CassRow {
  get(columnName: string | number): any;

  keys(): string[];

  forEach(callback: (row: CassRow) => void): void;

  values(): any[];

  [key: string]: any;
}

type CassandraResult = {
  info: any,
  length: number,
  columns: Array<{ name: string, type: { code: any, info: any } }>,
  rows: CassRow[],
  hasNext: boolean,
  pageState: string
  arrayMode: boolean
};

type CassandraVersion = {
  versionString: string,
  version: string
};

export class CassandraClient extends BasicDatabaseClient<CassandraResult> {
  client: cassandra.Client;
  versionInfo: CassandraVersion;

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(null, cassandraContext, server, database);
  }

  async connect(): Promise<void> {
    super.connect();

    const dbConfig = this.configDatabase(this.server, this.database);

    this.client = new cassandra.Client(dbConfig);
    this.versionInfo = await this.getVersion();

    this.knex = knexlib({
      client: CassandraKnex,
      connection: {
        contactPoints: dbConfig.contactPoints,
        localDataCenter: dbConfig.localDataCenter
      } as any
    });
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    return new CassandraChangeBuilder(table, [])
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      filterTypes: ['standard']
    }
  }

  async versionString(): Promise<string> {
    return this.versionInfo.versionString;
  }

  async listTables(_filter?: FilterOptions): Promise<TableOrView[]> {
    let sql: string;
    let params = []
    if (this.db) {
      sql =
      `
        SELECT table_name as name
        FROM system_schema.tables
        WHERE keyspace_name = ?;
      `
      params = [this.db];
    } else {
      sql =
      `
        SELECT table_name as name
        FROM system_schema.tables;
      `
    }

    // TODO (@day): move this to the rawExecuteQuery function
    const data = await this.driverExecuteSingle(sql, { params });
    return data.rows.map((row) => ({ name: row.name } as TableOrView));
  }

  listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return Promise.resolve([]) // TODO (@will): make sure cassandra doesn't actually do these things
  }

  listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return Promise.resolve([]); // TODO (@will): make sure cassandra doesn't actually do this
  }

  listMaterializedViewColumns(_tble: string, _schema?: string): Promise<TableColumn[]> {
    return Promise.resolve([]); // TODO (@will): make sure cassandra doesn't actually do this
  }

  async listTableColumns(table?: string, _schema?: string): Promise<ExtendedTableColumn[]> {
    let sql: string;
    const params = [table];
    // allow filtering explained a bit: https://www.datastax.com/blog/allow-filtering-explained
    if (this.db) {
      sql = `
        SELECT position, column_name, type
        FROM system_schema.columns
        WHERE table_name = ?
        AND keyspace_name = ?
        ALLOW FILTERING;
      `
      params.push(this.db)
    } else {
      sql = `
        SELECT position, column_name, type
        FROM system_schema.columns
        WHERE table_name = ?
        ALLOW FILTERING;
      `
    }
    const data = await this.driverExecuteSingle(sql, { params });
    return data.rows
      // force pks be placed at the results beginning
      .sort((a, b) => b.position - a.position)
      .map((row) => ({
        columnName: row.column_name,
        dataType: row.type,
        bksField: this.parseTableColumn(row as any),
      } as ExtendedTableColumn));
  }

  listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    return Promise.resolve([]) // TODO (@will): Make sure this isn't a thing since nosql so no real triggers
  }

  listTableIndexes(_table: string, _schema?: string): Promise<TableIndex[]> {
    return Promise.resolve([]) // TODO (@will): probably, but I think they don't really exist because you should be writing it better or something, idk
  }

  listSchemas(_filter?: SchemaFilterOptions): Promise<string[]> {
    return Promise.resolve([]) // TODO (@will): Make sure Cassandra doesn't actually do these things
  }

  getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]) // TODO (@will): Make sure this isn't a thing since you shouldn't be doing joins anyway?
  }

  async getOutgoingKeys(table: string, _schema?: string): Promise<TableKey[]> {
    const sql = `
      SELECT column_name
      FROM system_schema.columns
      WHERE table_name = ?
        AND kind = 'partition_key'
      ALLOW FILTERING
    `;
    const params = [
      table,
    ];
    const data = await this.driverExecuteSingle(sql, { params });
    return data.rows.map((row) => ({
      constraintName: null,
      columnName: row.column_name,
      referencedTable: null,
      keyType: 'PRIMARY KEY'
    } as any));
  }

  async getIncomingKeys(_table: string, _schema?: string): Promise<TableKey[]> {
    return [];
  }

  async query(queryText: string, _options?: any): Promise<CancelableQuery> {
    const pid = null;
    const cancelable = createCancelablePromise({
      ...errors.CANCELED_BY_USER,
      sqlectronError: 'CANCELED_BY_USER',
    } as any);

    return {
      execute: async () => {
        const queries = this.identifyCommands(queryText).map((query: any) => this.executeQuery(query.text))
        const retPromises = await Promise.all(queries)

        return retPromises.map(rp => rp[0])
      },

      // idk if this works. Should probably try it one day...
      cancel: async () => {
        if (!pid) {
          throw new Error('Query not ready to be canceled');
        }

        await this.driverExecuteSingle(`kill ${pid};`);
        cancelable.cancel();
      },
    };
  }

  async executeQuery(queryText: string, options?: any): Promise<NgQueryResult[]> {
    const commands = this.identifyCommands(queryText).map((item) => item.type);

    const data = await this.driverExecuteSingle(queryText, options);
    return [this.parseRowQueryResult(data, commands[0])];
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = 'SELECT keyspace_name FROM system_schema.keyspaces';
    const data = await this.driverExecuteSingle(sql);

    return data.rows.map((row) => row.keyspace_name);
  }

  async getTableProperties(table: string, _schema?: string): Promise<TableProperties> {
    const propsSql = `
      SELECT comment as description
      FROM system_schema.tables
      where table_name = ?
      allow filtering
    `

    const [
      tableInfo,
      relations
    ] =
    await Promise.all([
      this.driverExecuteSingle(propsSql, { params: [ table ] }),
      this.getTableKeys(table)
    ]);

    const { rows, length,  } = tableInfo
    const { description } = rows[0]

    return {
      description,
      size: length,
      relations,
      indexes: [], // indexes I believe are actually the primary keys
      triggers: [] // shouldn't have triggers
    }
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return Promise.resolve([]) // TODO: Make sure Cassandra doesn't  actually do this
  }

  async getPrimaryKey(table: string, _schema?: string): Promise<string> {
    const res = await this.getPrimaryKeys(table)
    return res.length === 1 ? res[0].columnName : null
  }

  async getPrimaryKeys(table: string, _schema?: string): Promise<PrimaryKeyColumn[]> {
    logger().debug('finding primary keys for', this.db, table)
    const sql = `select * from system_schema.columns where table_name=? allow filtering;`
    const params = [
      table,
    ];
    const { rows } = await this.driverExecuteSingle(sql, { params })

    if (!rows || rows.length === 0) return []
    return rows.reduce((acc, { column_name, kind, position }) => {
      if (kind.includes('_key')) {
        acc.push({
          columnName: column_name,
          position
        })
      }
      return acc
    }, [])
  }

  async listCharsets(): Promise<string[]> {
    return ['SimpleStrategy', 'NetworkTopologyStrategy']
  }

  async getDefaultCharset(): Promise<string> {
    return 'NetworkTopologyStrategy'
  }

  async listCollations(_charset: string): Promise<string[]> {
    return Array.from({length: 10}, (_e, i) => `${i + 1}`)
  }

  async createDatabase(databaseName: string, charset: string, collation: string): Promise<string> {
    const datacenters = this.client.getState().getConnectedHosts().map((h) => h.datacenter);
    // THIS FEELS DUMB, BUT :shrug:
    const strategy = charset, replicationFactor = collation;
    const rf = (strategy === 'NetworkTopologyStrategy') ?
      `${datacenters.map(dc => `'${dc}': ${replicationFactor}`).join(', ')}` :
      `'replication_factor': ${replicationFactor}`
    const query = `CREATE KEYSPACE ${this.wrapIdentifier(databaseName)} WITH REPLICATION = {'class': '${strategy}', ${rf}};`

    await this.driverExecuteSingle(query);
    return databaseName;
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async getTableCreateScript(table: string, schema?: string): Promise<string> {
    const sql = `describe ${schema}.${table};`
    const [createScriptResult] = await this.executeQuery(sql)
    const [createScript] = createScriptResult.rows

    return createScript.create_statement
  }

  getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]) // TODO: Views aren't really a thing in Cassandra
  }

  getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
    return Promise.resolve([]) // TODO: Routines really don't exist in Cassandra
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];
    let batchedChanges = [];

    if (changes.inserts) {
      batchedChanges = [...batchedChanges, ...this.insertRows(changes.inserts)];
    }

    if (changes.updates) {
      batchedChanges = [...batchedChanges, ...await this.updateValues(changes.updates)];
    }

    if (changes.deletes) {
      batchedChanges = [...batchedChanges, ...this.deleteRows(changes.deletes)];
    }

    await this.driverExecuteBatch(batchedChanges);

    if (changes.updates) {
      results = await this.getSelectUpdatedValues(changes.updates);
    }

    return results;
  }

  setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async setElementNameSql(_elementName: string, _newElementName: string, _typeOfElement: DatabaseElement): Promise<string> {
    return ''
  }

  async dropElement(elementName: string, typeOfElement: DatabaseElement, _schema?: string): Promise<void> {
    const sql = `DROP ${typeOfElement} ${this.wrapIdentifier(elementName)}`;

    await this.driverExecuteSingle(sql);
  }

  async truncateElementSql(elementName: string, typeOfElement: DatabaseElement, _schema?: string): Promise<string> {
    return `TRUNCATE ${typeOfElement} ${this.wrapIdentifier(elementName)}`;
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    const sql = `
      SELECT table_name
      FROM system_schema.tables
      WHERE keyspace_name = '${this.db}'
      ALLOW FILTERING;
    `;
    const [result] = await this.executeQuery(sql);
    const tables = result.rows.map((row) => row.table_name);
    const promises = tables.map((t) => {
      const truncateSQL = `
        TRUNCATE TABLE ${this.wrapIdentifier(this.db)}.${this.wrapIdentifier(t)};
      `;
      return this.executeQuery(truncateSQL);
    });

    await Promise.all(promises);
  }

  getTableLength(_table: string, _schema?: string): Promise<number> {
    throw new Error("Method not implemented.");
  }

  // keyspace takes the place of schema here
  async selectTop(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], keyspace?: string, selects?: string[]): Promise<TableResult> {
    // const { allowFilter } = userOptions
    // NOTE (@day): not sure why we added the userOptions thing here, talk to @will
    const allowFilter = true;
    const qs = this.buildSelectTopQueries({
      table, offset, limit, orderBy, filters, schema: keyspace, selects, allowFilter
    })

    const options: any = {
      prepare: true
    }

    if (limit) options.fetchSize = limit
    if (offset) options.pageState = offset

    const result = await this.driverExecuteSingle(qs.query, { params: qs.params, options })
    const { rows, columns, hasNext, pageState } = result
    const fields = columns ? this.parseQueryResultColumns(result) : []

    return {
      result: this.parseRows(rows, columns) || [],
      fields,
      hasNext,
      pageState: pageState || null
    } as any
  }

  async selectTopSql(table: string, offset: number, limit: number, orderBy: OrderBy[], filters: string | TableFilter[], keyspace?: string, selects?: string[]): Promise<string> {
    // const { allowFilter } = userOptions
    const allowFilter = true;
    const qs = this.buildSelectTopQueries({
      table, offset, limit, orderBy, filters, schema: keyspace, selects, allowFilter, inlineParams: true,
    });
    return qs.query;
  }

  async selectTopStream(table: string, orderBy: OrderBy[], filters: string | TableFilter[], chunkSize: number, _schema?: string): Promise<StreamResults> {
    const qs = this.buildSelectTopQuery(table, null, null, orderBy, filters)
    const columns = await this.listTableColumns(table)
    // const rowCount = await this.getTableLength(table, filters)
    const rowCount = 0; // we don't have a table length implemented yet
    // TODO: DEBUG HERE
    const { query, params } = qs

    return {
      totalRows: rowCount,
      columns,
      cursor: new CassandraCursor(this.client, query, params, chunkSize)
    }
  }

  queryStream(_query: string, _chunkSize: number): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  async duplicateTable(tableName: string, duplicateTableName: string, _schema?: string): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName);

    await this.driverExecuteSingle(sql);
  }

  async duplicateTableSql(tableName: string, duplicateTableName: string, _schema?: string): Promise<string> {
    const sql = `
      CREATE TABLE ${this.wrapIdentifier(duplicateTableName)} AS
      SELECT * FROM ${this.wrapIdentifier(tableName)}
    `;
    return sql;
  }

  wrapIdentifier(value: string): string {
    return D.wrapIdentifier(value)
  }

  protected async rawExecuteQuery(q: string, options: any): Promise<CassandraResult | CassandraResult[]> {
    const { params = [], queryOptions = { prepare: true }} = options;
    logger().info(`Running Query`, q, params)
    const data = await this.client.execute(q, params, queryOptions);
    return {
      info: data.info,
      length: data.rowLength,
      columns: data.columns,
      rows: data.rows,
      hasNext: data.nextPage != null,
      pageState: data.pageState,
      arrayMode: false,
    };
  }

  private configDatabase(server: IDbConnectionServer, database: { database: string }) {
    const { config: serverConfig } = server
    const config: any = {
      contactPoints: [serverConfig.host],
      protocolOptions: {
        port: serverConfig.port,
      },
      keyspace: database.database,
    };

    if (serverConfig?.cassandraOptions?.localDataCenter) {
      config.localDataCenter = serverConfig.cassandraOptions.localDataCenter
    }

    if (server.sshTunnel) {
      config.contactPoints = [serverConfig.localHost];
      config.protocolOptions.port = serverConfig.localPort;
    }

    if (serverConfig.ssl) {
      const sslOptions: any = {};

      if (serverConfig.sslCaFile) {
        sslOptions.ca = [readFileSync(serverConfig.sslCaFile)];
      }

      if (serverConfig.sslCertFile) {
        sslOptions.cert = readFileSync(serverConfig.sslCertFile);
      }

      if (serverConfig.sslKeyFile) {
        sslOptions.key = readFileSync(serverConfig.sslKeyFile);
      }

      config.sslOptions = sslOptions;
    }

    if (serverConfig.user && serverConfig.password) {
      const user = server.config.user;
      const password = server.config.password;
      const authProviderInfo = new cassandra.auth.PlainTextAuthProvider(user, password);
      config.authProvider = authProviderInfo;
    }

    return config;
  }

  private async getVersion() {
    const data = await this.driverExecuteSingle('select release_version from system.local;');
    const version = data?.rows[0]?.release_version;

    if (!version) {
      return {
        versionString: '',
        version: '4.0.7'
      };
    }

    return {
      versionString: version,
      version
    };
  }

  private identifyCommands(queryText) {
    try {
      return identify(queryText);
    } catch (err) {
      return [];
    }
  }

  private parseFields(fields, _row) {
    return fields.map((field) => {
      field.dataType = dataTypesToMatchTypeCode[field?.type?.code] || 'user-defined'
      field.id = field.name
      return field
    })
  }


  private parseRowQueryResult(data, command) {
    // Fallback in case the identifier could not recognize the command
    const isSelect = command ? command === 'SELECT' : Array.isArray(data.rows);
    const { columns, rows, rowLength } = data
    const fields = isSelect ? this.parseFields(columns, rows[0]) : []

    return {
      command: command || (isSelect && 'SELECT'),
      rows: this.parseRows(rows, columns)  || [],
      fields: fields,
      // FIXME not sure what this is, this causes the query to fail. .isPaged() is not defined.
      // isPaged: data.isPaged(),
      rowCount: isSelect ? (rowLength || 0) : undefined,
      affectedRows: !isSelect && !isNaN(rowLength) ? rowLength : undefined,
    };
  }

  private async driverExecuteBatch(batchStatements: { query: string, params?: cassandra.ArrayOrObject }[]) {
    logger().info(`Running a Batch update/delete/insert`)
    try {
      await this.client.batch(batchStatements, { prepare: true })
    } catch (err) {
      logger().error(err)
      throw err
    }
  }

  private insertRows(rows) {
    return rows.map(row => {
      const [data] = row.data
      const columns = Object.keys(data)
      return {
        query: `INSERT INTO ${row.table} (${columns.join(', ')}) VALUES (${Array(columns.length).fill('?', 0, columns.length)})`,
        params: columns.map(c => data[c] || null)
      }
    })
  }

  private deleteRows(rows) {
    return rows.map(row => {
      const [data] = row.primaryKeys
      return {
        query: `DELETE FROM ${row.table} where ${this.wrapIdentifier(data.column)} = ?`,
        params: [data.value]
      }
    })
  }

  private async updateValues(updates) {
    return updates.map(update => {
      const value = update.value
      const [updateParams, updateWhereList] = this.getParamsAndWhereList(update.primaryKeys, value)
      const where = updateWhereList.join(' AND ')
      return {
        query: `UPDATE ${this.wrapIdentifier(update.table)} SET ${this.wrapIdentifier(update.column)} = ? WHERE ${where}`,
        params: updateParams
      }
    })
  }

  private getParamsAndWhereList(primaryKeys, initialValue = undefined) {
    const params = initialValue !== undefined ? [initialValue] : [];
    const whereList = [];
    primaryKeys.forEach(({ column, value }) => {
      whereList.push(`${this.wrapIdentifier(column)} = ?`);
      params.push(value);
    });

    return [params, whereList];
  }

  private async getSelectUpdatedValues(updates): Promise<Array<any>> {
    const updatePromises = updates.map(update => {
      const [updateParams, updateWhereList] = this.getParamsAndWhereList(update.primaryKeys);
      const query = `SELECT * FROM ${this.wrapIdentifier(update.table)} WHERE ${updateWhereList.join(' AND ')}`;

      return this.driverExecuteSingle(query, { params: updateParams });
    });

    const selectPromises: any = await Promise.all(updatePromises);

    return selectPromises.reduce((acc: Array<any>, sp: any) => {
      const [data] = sp.rows;
      if (data) acc.push(data);

      return acc;
    }, []);
  }

  // ripped right from the postgres file so there's some possible overflow.
  // removed "order by" as it has many rules to get running through. One suggestion was using Materialized Views
  // https://www.datastax.com/blog/new-cassandra-30-materialized-views
  private buildSelectTopQueries(options) {
    const filters = options.filters
    const selects = options.selects ?? ['*']
    const inlineParams = options.inlineParams ?? false

    const { filterString, filterParams } = this.buildFilterString(filters, { inlineParams })

    const selectSQL = `SELECT ${selects.join(', ')}`
    const baseSQL = `
      FROM ${this.fqTableName(options.table, options.schema)}
      ${filterString}
    `
    const allowFilter = options.allowFilter ? 'ALLOW FILTERING' : ''
    const query = `${selectSQL} ${baseSQL} ${allowFilter};`
    // FIXME: Implement paging through results using 'token', see below
    // https://www.codesandnotes.be/2015/10/01/cassandra-pagination-for-stateless-web-apps-using-cql-or-querybuilder/
    return {
      query, params: filterParams
    }
  }


  private buildSelectTopQuery(table, offset, limit, orderBy, filters, countTitle = 'total', columns = [], selects = ['*']) {
    log.debug('building selectTop for', table, offset, limit, orderBy, selects)

    let filterString = ''
    let filterParams = []
    if (_.isString(filters)) {
      filterString = `WHERE ${filters}`
    } else {
      const filterBlob = this.buildFilterString(filters, columns)
      filterString = filterBlob.filterString
      filterParams = filterBlob.filterParams
    }

    const selectSQL = `SELECT ${selects.map((s) => this.wrapIdentifier(s)).join(", ")}`
    const baseSQL = `
      FROM ${table}
      ${filterString}
    `
    const allowFilter = filters?.length > 0 ? ' ALLOW FILTERING' : ''

    const countSQL = `
      select count(*) as ${countTitle}
      ${baseSQL}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
      ${allowFilter}
    `
    const sql = `
      ${selectSQL} ${baseSQL}
      ${_.isNumber(limit) ? `LIMIT ${limit}` : ''}
      ${_.isNumber(offset) ? `OFFSET ${offset}` : ""}
      ${allowFilter}
      `
    return {query: sql, countQuery: countSQL, params: filterParams}
  }

  private buildFilterString(filters, options: any = {}) {
    const inlineParams = options.inlineParams
    let filterString = ""
    let filterParams = []
    if (filters && _.isArray(filters) && filters.length > 0) {
      filterString = "WHERE " + filters.map((item) => {
        const field = this.wrapIdentifier(item.field);
        if (item.type === 'in') {
          let values = ''
          if (_.isArray(item.value)) {
            values = item.value.map((v) => (inlineParams ? v : "?")).join(",")
          } else {
            values = inlineParams ? item.value : "?"
          }
          return `${field} ${item.type} (${values})`
        }

        const value = inlineParams ? item.value : "?"

        return `${field} ${item.type} ${value}`
      }).join(" AND ")

      filterParams = filters.flatMap((item) => {
        return _.isArray(item.value) ? item.value : [item.value]
      })
    } else if (_.isString(filters)) {
      filterString = filters
    }
    return {
      filterString, filterParams
    }
  }

  private fqTableName(table, keyspace) {
    return keyspace && keyspace.length ?
      `${this.wrapIdentifier(keyspace)}.${this.wrapIdentifier(table)}` :
      this.wrapIdentifier(table)
  }

  parseTableColumn(column: { column_name: string; type: string }): BksField {
    return {
      name: column.column_name,
      bksType: column.type.includes('blob') ? 'BINARY' : 'UNKNOWN',
    };
  }

  private parseRows(rows, columns) {
    if (!rows || !columns) return [];

    const typeByColumn = columns?.reduce((acc, col) => {
      acc[col.name] = col.type;
      return acc;
    }, {});

    return rows?.map((row) => {
      Object.keys(row).forEach((key) => {
        const value = row[key];
        const typeCode = typeByColumn[key].code;

        if (typeCode == cassandra.types.dataTypes.list) {
          row[key] = value?.map((v) => this.convertValueByType(v, typeByColumn[key].info.code));
          return;
        }

        row[key] = this.convertValueByType(value, typeCode);
      });
      return row;
    });
  }

  private convertValueByType(value, type) {
    if (value == null || value === undefined) {
      return null;
    }

    switch (type) {
      case cassandra.types.dataTypes.bigint:
        return String(value);
      case cassandra.types.dataTypes.timestamp:
        return value ? value.toISOString() : null;
      case cassandra.types.dataTypes.time:
      case cassandra.types.dataTypes.date:
        return value ? String(value) : null;
      case cassandra.types.dataTypes.uuid:
      case cassandra.types.dataTypes.timeuuid:
        return value?.buffer
          ? new cassandra.types.Uuid(Buffer.from(value.buffer)).toString()
          : value;
      case cassandra.types.dataTypes.inet:
        return value ? value.toString() : null;
      default:
        return value;
    }
  }
}
