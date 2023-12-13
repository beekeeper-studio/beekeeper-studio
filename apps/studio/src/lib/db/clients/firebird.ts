// @ts-nocheck

import electronLog from "electron-log";
import knexlib, { Knex } from "knex";
import KnexQueryBuilder from 'knex/lib/query/querybuilder'
import knexFirebirdDialect from "knex-firebird-dialect";
import Firebird from "node-firebird";
import { identify } from "sql-query-identifier";
import {
  DatabaseElement,
  IDbConnectionDatabase,
  IDbConnectionServer,
} from "../client";
import {
  CancelableQuery,
  NgQueryResult,
  PrimaryKeyColumn,
  TableChanges,
  TableDelete,
  TableFilter,
  TableIndex,
  TableInsert,
  TableOrView,
  TableProperties,
  TableTrigger,
  TableUpdate,
  TableUpdateResult,
  FilterOptions,
  ExtendedTableColumn,
  OrderBy,
  TableResult,
  DatabaseFilterOptions,
} from "../models";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "./BasicDatabaseClient";
import _ from "lodash";
import { joinFilters } from "@/common/utils";
import { FirebirdChangeBuilder } from "@shared/lib/sql/change_builder/FirebirdChangeBuilder";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { FirebirdData } from "@shared/lib/dialects/firebird";
import { buildDeleteQueries, buildUpdateQueries } from "./utils";

type FirebirdResult = {
  data: any;
  statement: Statement;
  // Number of changes made by the query
  changes: number;
};

const log = electronLog.scope("firebird");

const context = {
  getExecutionContext(): ExecutionContext {
    return null;
  },
  logQuery(
    _query: string,
    _options: QueryLogOptions,
    _context: ExecutionContext
  ): Promise<number | string> {
    return null;
  },
};

function identifyCommands(queryText: string) {
  try {
    // FIXME: sql-query-identifier does not support firebird
    return identify(queryText, {});
  } catch (err) {
    return [];
  }
}

function buildFilterString(filters: TableFilter[], columns = []) {
  let filterString = "";
  let filterParams = [];
  if (filters && _.isArray(filters) && filters.length > 0) {
    const allFilters = filters.map((item) => {
      const column = columns.find((c) => c.columnName === item.field);
      const field = column?.dataType.toUpperCase().includes("BINARY")
        ? `HEX(${item.field})`
        : item.field;

      if (item.type === "in") {
        const questionMarks = _.isArray(item.value)
          ? item.value.map(() => "?").join(",")
          : "?";

        return `${field} ${item.type.toUpperCase()} (${questionMarks})`;
      }
      return `${field} ${item.type.toUpperCase()} ?`;
    });
    filterString = "WHERE " + joinFilters(allFilters, filters);

    filterParams = filters.flatMap((item) => {
      return _.isArray(item.value) ? item.value : [item.value];
    });
  }
  return {
    filterString,
    filterParams,
  };
}

// Only build an insert query from the first index of insert.data
function buildInsertQuery(
  knex: Knex,
  insert: TableInsert,
  columns = [],
  bitConversionFunc: any = _.toNumber
) {
  const data = _.cloneDeep(insert.data);
  data.forEach((item) => {
    const insertColumns = Object.keys(item);
    insertColumns.forEach((ic) => {
      const matching = _.find(columns, (c) => c.columnName === ic);
      if (
        matching &&
        matching.dataType &&
        matching.dataType.startsWith("bit(")
      ) {
        if (matching.dataType === "bit(1)") {
          item[ic] = bitConversionFunc(item[ic]);
        } else {
          item[ic] = parseInt(item[ic].split("'")[1], 2);
        }
      }

      // HACK (@day): fixes #1734. Knex reads any '?' in identifiers as a parameter, so we need to escape any that appear.
      if (ic.includes("?")) {
        const newIc = ic.replaceAll("?", "\\?");
        item[newIc] = item[ic];
        delete item[ic];
      }
    });
  });
  const builder = knex(insert.table);
  if (insert.schema) {
    builder.withSchema(insert.schema);
  }
  const query = builder
    // TODO: try extending the builder instead
    .insert(data[0])
    .toQuery();
  return query;
}

function buildInsertQueries(knex: Knex, inserts: TableInsert[]) {
  return inserts.map((insert) => buildInsertQuery(knex, insert));
}

class Connection {
  constructor(private database: Firebird.Database) {}

  get() {
    return this.database;
  }

  release(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.database.detach((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  query(query: string, params: any[]): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.database.query(query, params, (err: any, result: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result);
      });
    });
  }
}

class Pool {
  private pool: Firebird.ConnectionPool;

  constructor(config: Firebird.Options) {
    this.pool = Firebird.pool(5, config);
  }

  query(query: string, params: any[]): Promise<any[]> {
    return new Promise((_resolve, _reject) => {
      this.pool.get((err, database) => {
        function reject(err: any) {
          _reject(err);
          database.detach();
        }

        function resolve(result: any[]) {
          database.detach();
          _resolve(result);
        }

        if (err) {
          reject(err);
          return;
        }

        if (typeof query !== "string") {
          reject(new Error("Invalid query. Query must be a string."));
          return;
        }

        database.query(query, params, (err: any, result: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(result);
        });
      });
    });
  }

  acquire(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      let connection: Connection | undefined;
      try {
        this.pool.get((err, database) => {
          if (err) {
            reject(err);
            return;
          }
          connection = new Connection(database);
          resolve(connection);
        });
      } catch (err) {
        connection.release();
        reject(err);
      }
    });
  }

  destroy() {
    this.pool.destroy();
  }
}

export class FirebirdClient extends BasicDatabaseClient<FirebirdResult> {
  version: any;
  pool: Pool;

  constructor(
    protected server: IDbConnectionServer,
    protected database: IDbConnectionDatabase
  ) {
    super(null, context);
  }

  versionString(): string {
    return this.version;
  }

  async connect(): Promise<void> {
    const config = {
      host: this.server.config.host,
      port: this.server.config.port,
      user: this.server.config.user,
      password: this.server.config.password,
      database: this.database.database,
      lowercase_keys: true,
    };

    log.debug("create driver client for postgres with config %j", config);

    this.pool = new Pool(config);

    const versionResult = await this.driverExecuteSingle(
      "SELECT RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION') from rdb$database;"
    );
    this.version = versionResult.data[0]["rdb$get_context"];

    const serverConfig = this.server.config;
    const knex = knexlib({
      client: knexFirebirdDialect,
      connection: {
        host: serverConfig.socketPathEnabled ? undefined : serverConfig.host,
        socketPath: serverConfig.socketPathEnabled
          ? serverConfig.socketPath
          : undefined,
        port: serverConfig.port,
        user: serverConfig.user,
        password: serverConfig.password,
        database: this.database.database,
        /* eslint-disable-next-line */
        // @ts-ignore
        lowercase_keys: true,
        blobAsText: true,
      },
    });
    this.knex = knex;

    log.debug("connected");
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    return new FirebirdChangeBuilder(table);
  }

  async listTables(
    _db: string,
    filter?: FilterOptions // TODO implement filter
  ): Promise<TableOrView[]> {
    const result = await this.driverExecuteSingle(`
      SELECT a.RDB$RELATION_NAME
      FROM RDB$RELATIONS a
      WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0 AND RDB$RELATION_TYPE = 0
    `);
    return result.data;
  }

  async listTableColumns(
    _db: string,
    table?: string,
    _schema?: string
  ): Promise<ExtendedTableColumn[]> {
    const result = await this.driverExecuteSingle(
      `
      SELECT
        TRIM(r.rdb$relation_name) AS rdb$relation_name,
        TRIM(r.rdb$field_name) AS rdb$field_name,
        r.rdb$field_source,
        f.rdb$field_length,
        f.rdb$character_length,
        TRIM(CASE f.rdb$field_type
          WHEN 261 THEN 'blob'
          WHEN 14 THEN 'char'

          WHEN 40 THEN 'cstring'

          WHEN 11 THEN 'd_float'

          WHEN 27 THEN 'double'
          WHEN 10 THEN 'float'
          WHEN 16 THEN
            CASE f.rdb$field_scale
              WHEN 0 THEN 'bigint'
              ELSE 'double'
            END
          WHEN 8 THEN 'integer'

          WHEN 9 THEN 'quad'
          WHEN 7 THEN 'smallint'
          WHEN 12 THEN 'date'
          WHEN 13 THEN 'time'
          WHEN 35 THEN 'timestamp'
          WHEN 37 THEN 'varchar'
          ELSE 'unknown'
        END) AS field_type,
        f.rdb$field_scale,
        f.rdb$field_sub_type,
        r.rdb$default_value,
        r.rdb$null_flag

      FROM
        rdb$relation_fields r
        JOIN rdb$fields f
          ON f.rdb$field_name = r.rdb$field_source
        JOIN rdb$relations rl
          ON rl.rdb$relation_name = r.rdb$relation_name

      WHERE
        COALESCE(r.rdb$system_flag, 0) = 0
        AND
        COALESCE(rl.rdb$system_flag, 0) = 0
        AND
        rl.rdb$view_blr IS NULL
        ${table ? "AND r.rdb$relation_name = ?" : ""}

      ORDER BY
        r.rdb$relation_name,
        r.rdb$field_position
      `,
      table ? { params: [table.toUpperCase()] } : undefined
    );

    async function readBlob(callback: any): Promise<Buffer> {
      return new Promise<Buffer>(async (resolve, reject) => {
        await callback(async (err: any, _name: unknown, event: any) => {
          const buffers = [];
          if (err) {
            reject(err);
            return;
          }
          event.on("data", (chunk: any) => {
            buffers.push(chunk);
          });
          event.once("end", () => {
            resolve(Buffer.concat(buffers));
          });
        });
      });
    }

    return await Promise.all(
      result.data.map(async (row: any) => {
        let dataType = row["field_type"];
        let defaultValue: Function | Buffer | string | null =
          row["rdb$default_value"];

        if (typeof defaultValue === "function") {
          defaultValue = await readBlob(defaultValue);
        }

        if (dataType === "varchar" || dataType === "char") {
          dataType += `(${row["rdb$character_length"]})`;

          // If it's buffer (BINARY BLR), it contains metadata so we need to extract it
          if (Buffer.isBuffer(defaultValue)) {
            const chars = defaultValue.toString();
            const lengthCodes = [];
            let state: "HEADER1" | "HEADER2" = "HEADER1";
            let start = 0;
            for (let i = 0; i < chars.length; i++) {
              const code = chars.charCodeAt(i);
              if (state === "HEADER2") {
                lengthCodes.push(code);
              }
              if (code === 0 && state === "HEADER1") {
                state = "HEADER2";
                continue;
              } else if (code === 0 && state === "HEADER2") {
                start = i + 1;
                lengthCodes.pop();
                break;
              }
            }
            const length = Buffer.from(lengthCodes).readUint8();
            defaultValue = chars.slice(start, start + length);
          }
        }

        return {
          tableName: row["rdb$relation_name"],
          columnName: row["rdb$field_name"],
          dataType,
          defaultValue,
          nullable: row["rdb$null_flag"] === null,
        };
      })
    );
  }

  async getPrimaryKey(
    _db: string,
    table: string,
    _schema?: string
  ): Promise<string | null> {
    const columns = await this.getPrimaryKeys(_db, table, _schema);
    return columns[0]?.columnName ?? null;
  }

  async getPrimaryKeys(
    _db: string,
    table: string,
    _schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    const result = await this.driverExecuteSingle(
      `
      SELECT
        TRIM(sg.rdb$field_name) as rdb$field_name,
        sg.rdb$field_position,
        rc.rdb$relation_name
      FROM
        rdb$indices ix
        LEFT JOIN rdb$index_segments sg ON ix.rdb$index_name = sg.rdb$index_name
        LEFT JOIN rdb$relation_constraints rc ON rc.rdb$index_name = ix.rdb$index_name
      WHERE
        rc.rdb$constraint_type = 'PRIMARY KEY'
        AND rc.rdb$relation_name = ?
    `,
      { params: [table.toUpperCase()] }
    );
    return result.data.map((row: any) => ({
      columnName: row["rdb$field_name"],
      position: row["rdb$field_position"],
    }));
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects = ["*"]
  ): Promise<TableResult> {
    const { query, params } = this.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      schema,
      selects
    );

    const result = await this.driverExecuteSingle(query, { params });

    return {
      result: result.data,
      fields: Object.keys(result.data[0] || {}),
    };
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    schema?: string,
    selects?: string[]
  ): Promise<string> {
    const { query, params } = this.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      schema,
      selects
    );
    return this.knex.raw(query, params).toString();
  }

  private buildSelectTopQuery(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ) {
    let orderByString = "";
    if (orderBy && orderBy.length > 0) {
      orderByString = "ORDER BY ";
      orderByString += orderBy
        .map((item: any) =>
          _.isObject(item)
            ? `${item["field"]} ${item["dir"].toUpperCase()}`
            : `${item}`
        )
        .join(",");
    }

    let filterString = "";
    let filterParams = [];
    if (_.isString(filters)) {
      filterString = `WHERE ${filters}`;
    } else {
      const filterBlob = buildFilterString(filters);
      filterString = filterBlob.filterString;
      filterParams = filterBlob.filterParams;
    }

    return {
      query: `
        SELECT
          ${_.isNumber(limit) ? `FIRST ${limit}` : ""}
          ${_.isNumber(offset) ? `SKIP ${offset}` : ""}
            ${selects.join(", ")}
        FROM ${table}
        ${filterString}
        ${orderByString}
      `,
      params: filterParams,
    };
  }

  // TODO complete this function
  async query(queryText: string): CancelableQuery {
    return {
      execute: async () => {
        const query = identifyCommands(queryText);
        const results = await this.driverExecuteMultiple(queryText);
        return results.map(({ data, statement }) => ({
          command: statement.type,
          rows: data,
        }));
      },
      cancel: () => {
        // TODO
      },
    };
  }

  async getInsertQuery(tableInsert: TableInsert): Promise<string> {
    if (tableInsert.data.length > 1) {
      // TODO: We can't insert multiple rows at once with Firebird. And
      // firebird knex only accepts an object instead of an array, while the
      // other dialects accept arrays. So this must be handled in knex instead?
      throw new Error("Inserting multiple rows is not supported.");
    }
    const columns = await this.listTableColumns(
      null,
      tableInsert.table,
      tableInsert.schema
    );
    return buildInsertQuery(this.knex, tableInsert, columns);
  }

  async listTableTriggers(
    table: string,
    schema?: string
  ): Promise<TableTrigger[]> {
    const result = await this.driverExecuteSingle(`SELECT * FROM RDB$TRIGGERS`);
    return result.data;
  }

  async listTableIndexes(
    db: string,
    table: string,
    schema?: string
  ): Promise<TableIndex[]> {
    const result = await this.driverExecuteSingle(`
      SELECT
        rid.rdb$index_id,
        TRIM(rid.rdb$index_name) as rdb$index_name,
        TRIM(rid.rdb$relation_name) as rdb$relation_name,
        rid.rdb$index_type,
        rid.rdb$unique_flag,
        TRIM(rseg.rdb$field_name) as rdb$field_name,
        rseg.rdb$field_position,
        TRIM(rc.rdb$constraint_type) as rdb$constraint_type

      FROM rdb$index_segments rseg
        JOIN rdb$indices rid
          ON (rseg.rdb$index_name = rid.rdb$index_name)
        JOIN rdb$relation_fields rrel
          ON (rid.rdb$relation_name = rrel.rdb$relation_name AND rseg.rdb$field_name = rrel.rdb$field_name)
        LEFT OUTER JOIN rdb$relation_constraints rc
          ON (rc.rdb$index_name = rid.rdb$index_name AND rc.rdb$relation_name = rid.rdb$relation_name)

      WHERE rid.rdb$system_flag = 0
    `);

    const grouped = _.groupBy(result.data, "rdb$index_name");

    return Object.keys(grouped).map((name) => {
      const blob = grouped[name];
      const order = blob[0]["rdb$index_type"] === 1 ? "DESC" : "ASC";
      const unique = blob[0]["rdb$unique_flag"] === 1;
      const primary =
        blob.findIndex((b) => b["rdb$constraint_type"] === "PRIMARY KEY") !==
        -1;
      return {
        id: blob[0]["rdb$index_id"],
        table: blob[0]["rdb$relation_name"],
        schema: "",
        name,
        columns: _.sortBy(blob, "rdb$field_position").map((b) => ({
          name: b["rdb$field_name"],
          order,
        })),
        unique,
        primary,
      };
    });
  }

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    _schema?: string
  ): Promise<void> {
    await this.driverExecuteSingle(`DROP ${typeOfElement} ${elementName}`);
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    // TODO implement filter
    const result = await this.driverExecuteSingle(`
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$RELATION_TYPE = 0 AND RDB$SYSTEM_FLAG = 0
    `);
    return result.data;
  }

  async truncateElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): Promise<void> {
    // There is no internal function to truncate a table
  }

  async duplicateTable(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): Promise<void> {
    // There is no internal function to duplicate a table
  }

  async createDatabase(
    databaseName: string,
    charset: string,
    collation: string
  ): Promise<void> {
    // TODO
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];
    const connection = await this.pool.acquire();
    const cli = { connection };

    await this.driverExecuteSingle("SET TRANSACTION", cli);

    try {
      if (changes.inserts) {
        await this.insertRows(cli, changes.inserts);
      }

      if (changes.updates) {
        results = await this.updateValues(cli, changes.updates);
      }

      if (changes.deletes) {
        await this.deleteRows(cli, changes.deletes);
      }

      await this.driverExecuteSingle("COMMIT", cli);
    } catch (ex) {
      log.error("query exception: ", ex);
      // FIXME: rollback doesn't work
      await this.driverExecuteSingle("ROLLBACK", cli);
      await connection.release();
      throw ex;
    }

    await connection.release();

    return results;
  }

  applyChangesSql(changes: TableChanges): string {
    let queriesStr = "";
    buildInsertQueries(this.knex, changes.inserts || []).forEach((query) => {
      queriesStr += `${query};`;
    });
    buildUpdateQueries(this.knex, changes.updates || []).forEach((query) => {
      queriesStr += `${query};`;
    });
    buildDeleteQueries(this.knex, changes.deletes || []).forEach((query) => {
      queriesStr += `${query};`;
    });
    return queriesStr;
  }

  async insertRows(cli: any, inserts: TableInsert[]) {
    for (const command of buildInsertQueries(this.knex, inserts)) {
      await this.driverExecuteSingle(command, cli);
    }
  }

  async updateValues(
    cli: any,
    updates: TableUpdate[]
  ): Promise<TableUpdateResult[]> {
    const commands = updates.map((update) => {
      const params = [
        _.isBoolean(update.value) ? _.toInteger(update.value) : update.value,
      ];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${FirebirdData.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");

      return {
        query: `UPDATE ${update.table} SET ${update.column} = ? WHERE ${where}`,
        params: params,
      };
    });

    const results = [];
    // TODO: this should probably return the updated values
    for (let index = 0; index < commands.length; index++) {
      const blob = commands[index];
      await this.driverExecuteSingle(blob.query, {
        ...cli,
        params: blob.params,
      });
    }

    const returnQueries = updates.map((update) => {
      const params = [];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${FirebirdData.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");

      return {
        query: `select * from ${update.table} where ${where}`,
        params: params,
      };
    });

    for (let index = 0; index < returnQueries.length; index++) {
      const blob = returnQueries[index];
      const r = await this.driverExecuteSingle(blob.query, {
        ...cli,
        params: blob.params,
      });
      if (r.data[0]) results.push(r.data[0]);
    }

    return results;
  }

  async deleteRows(cli: any, deletes: TableDelete[]) {
    for (const command of buildDeleteQueries(this.knex, deletes)) {
      await this.driverExecuteSingle(command, cli);
    }
  }

  async getTableProperties(
    table: string,
    _schema?: string
  ): Promise<TableProperties> {
    const result = await this.driverExecuteSingle(`
      SELECT * FROM rdb$relations WHERE rdb$relation_name = ${FirebirdData.escapeString(
        table
      ).toUpperCase()}
    `);
    const row = result.data[0];

    return {
      description: row["rdb$description"],
      size: undefined, // TODO implement size
      indexSize: undefined, // TODO implement indexSize
      indexes: [], // TODO implement indexes
      relations: [], // TODO implement relations
      triggers: [], // TODO implement triggers
      owner: row["rdb$owner_name"],
      createdAt: undefined, // TODO implement createdAt
    };
  }

  async executeQuery(
    queryText: string,
    options?: any
  ): Promise<NgQueryResult[]> {
    const result = await this.driverExecuteMultiple(queryText, options);
    return result.map(({ data, statement }) => ({
      fields: [], // TODO implement fields
      affectedRows: undefined, // TODO implement affectedRows
      command: statement.type,
      rows: data ?? [],
      rowCount: data?.length ?? 0,
    }));
  }

  async disconnect(): Promise<void> {
    this.pool.destroy();
  }

  protected async rawExecuteQuery(
    queryText: string,
    options: {
      connection?: Connection;
      multiple?: boolean;
      params?: any[];
    } = {}
  ): Promise<FirebirdResult | FirebirdResult[]> {
    const queries = identifyCommands(queryText);
    const params = options.params ?? [];

    const results = [];

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      const result = options.connection
        ? await options.connection.query(query.text, params)
        : await this.pool.query(query.text, params);

      results.push({
        data: result,
        statement: query,
      });
    }

    return options.multiple ? results : results[0];
  }
}

export default async function (
  server: IDbConnectionServer,
  database: IDbConnectionDatabase
) {
  const client = new FirebirdClient(server, database);
  await client.connect();
  return client;
}
