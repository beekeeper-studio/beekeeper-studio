// /* eslint-disable-next-line */
// // @ts-nocheck

import electronLog from "electron-log";
import knexlib, { Knex } from "knex";
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
  SupportedFeatures,
  SchemaFilterOptions,
  StreamResults,
  TableColumn,
  Routine,
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
import { Pool, Connection, Transaction } from "./firebird/Pool";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { TableKey } from "@shared/lib/dialects/models";

type FirebirdResult = {
  rows: any[];
  meta: any[];
  statement: IdentifyResult;
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
      blobAsText: true,
    };

    if (typeof config.database !== "string" || config.database === "") {
      throw new Error("Invalid database name");
    }

    log.debug("create driver client for postgres with config %j", config);

    this.pool = new Pool(config);

    // TODO use node firebird service
    const versionResult = await this.driverExecuteSingle(
      "SELECT RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION') from rdb$database;"
    );
    this.version = versionResult.rows[0]["RDB$GET_CONTEXT"];

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
        // eslint-disable-next-line
        // @ts-ignore
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
    _filter?: FilterOptions
  ): Promise<TableOrView[]> {
    const result = await this.driverExecuteSingle(`
      SELECT TRIM(a.RDB$RELATION_NAME) as RDB$RELATION_NAME
      FROM RDB$RELATIONS a
      WHERE COALESCE(RDB$SYSTEM_FLAG, 0) = 0 AND RDB$RELATION_TYPE = 0
    `);
    return result.rows.map((row: any) => ({
      name: row["RDB$RELATION_NAME"],
      entityType: "table",
    }));
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
        f.rdb$field_type,
        r.rdb$field_position,
        r.rdb$description,
        TRIM(CASE f.rdb$field_type

          WHEN 7 THEN 'SMALLINT'
          WHEN 8 THEN
            CASE f.rdb$field_sub_type
              WHEN 2 THEN 'DECIMAL'
              ELSE 'INTEGER'
            END
          WHEN 10 THEN 'FLOAT'
          WHEN 12 THEN 'DATE'
          WHEN 13 THEN 'TIME'
          WHEN 14 THEN 'CHAR'
          WHEN 16 THEN
            CASE f.rdb$field_scale
              WHEN 0 THEN 'BIGINT'
              ELSE 'DOUBLE'
            END
          WHEN 23 THEN 'BOOLEAN'
          WHEN 24 THEN 'DECFLOAT(16)'
          WHEN 25 THEN 'DECFLOAT(16)'
          WHEN 26 THEN 'INT128'
          WHEN 27 THEN 'DOUBLE PRECISION'
          WHEN 28 THEN 'TIME WITH TIME ZONE'
          WHEN 29 THEN 'TIMESTAMP WITH TIME ZONE'
          WHEN 35 THEN 'TIMESTAMP'
          WHEN 37 THEN 'VARCHAR'
          WHEN 261 THEN 'BLOB'

          WHEN 9 THEN 'QUAD'
          WHEN 11 THEN 'D_FLOAT'
          WHEN 27 THEN 'DOUBLE'
          WHEN 40 THEN 'CSTRING'

          ELSE 'UNKNOWN'

        END) AS field_type,
        f.rdb$field_scale,
        f.rdb$field_sub_type,
        r.rdb$default_source,
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

    return await Promise.all(
      result.rows.map(async (row: any) => {
        // const subType = row["RDB$FIELD_SUB_TYPE"];
        let dataType = row["FIELD_TYPE"];

        if (dataType === "VARCHAR" || dataType === "CHAR") {
          dataType += `(${row["RDB$CHARACTER_LENGTH"]})`;
        }

        const defaultValue =
          typeof row["RDB$DEFAULT_SOURCE"] === "string"
            ? row["RDB$DEFAULT_SOURCE"].replace("DEFAULT ", "")
            : null;

        const nullable = row["RDB$NULL_FLAG"] === null;

        return {
          tableName: row["RDB$RELATION_NAME"],
          columnName: row["RDB$FIELD_NAME"],
          ordinalPosition: row["RDB$FIELD_POSITION"],
          comment: row["RDB$DESCRIPTION"],
          dataType,
          defaultValue,
          nullable,
        };
      })
    );
  }

  static async readBlob(
    callback: (transaction: any, callback?: any) => void
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      callback(async (err: any, _name: unknown, event: any) => {
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

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const result = await this.driverExecuteSingle(`
      SELECT RDB$RELATION_NAME
        FROM RDB$RELATIONS
      WHERE RDB$VIEW_BLR IS NOT NULL
        AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0);
    `)
    return result.rows.map((row) => row['RDB$RELATION_NAME'])
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    return []; // TODO
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
    return result.rows.map((row: any) => ({
      columnName: row["RDB$FIELD_NAME"],
      position: row["RDB$FIELD_POSITION"],
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
    const { query, params } = FirebirdClient.buildSelectTopQuery(
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
      result: result.rows,
      fields: Object.keys(result.rows[0] || {}),
    };
  }

  async selectTopSql(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<string> {
    const { query, params } = FirebirdClient.buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      undefined,
      selects
    );
    return this.knex.raw(query, params).toString();
  }

  private static buildSelectTopQuery(
    table: string,
    offset?: number,
    limit?: number,
    orderBy?: OrderBy[],
    filters: string | TableFilter[] = [],
    countTitle = 'total',
    selects: string[] = ['*']
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
      countQuery: `SELECT COUNT(*) AS ${countTitle} FROM ${table}`,
      params: filterParams,
    };
  }

  query(queryText: string): CancelableQuery {
    return {
      execute: async () => {
        const driverResult = await this.driverExecuteMultiple(queryText, { rowAsArray: true });
        return driverResult.map(({ rows: result, meta }) => {
          const rows = result.map((row: Record<string, any>) => {
            const transformedRow = {}
            Object.keys(row).forEach((key, idx) => {
              transformedRow[`c${idx}`] = row[key];
            })
            return transformedRow
          })
          const fields = meta.map((field, idx) => ({
            id: `c${idx}`,
            name: field.alias || field.field,
          }))
          return { fields, rows };
        });
      },
      cancel: async () => {
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
    _schema?: string
  ): Promise<TableTrigger[]> {
    // Refs
    // Trigger type - https://firebirdsql.org/file/documentation/html/en/refdocs/fblangref40/firebird-40-language-reference.html#fblangref-appx04-triggers-type
    const result = await this.driverExecuteSingle(`
      SELECT
        RDB$TRIGGER_NAME,
        RDB$RELATION_NAME,
        TRIM(CASE RDB$TRIGGER_TYPE
          WHEN 1 THEN 'BEFORE INSERT'
          WHEN 2 THEN 'AFTER INSERT'
          WHEN 3 THEN 'BEFORE UPDATE'
          WHEN 4 THEN 'AFTER UPDATE'
          WHEN 5 THEN 'BEFORE DELETE'
          WHEN 6 THEN 'AFTER DELETE'
          WHEN 17 THEN 'BEFORE INSERT OR UPDATE'
          WHEN 18 THEN 'AFTER INSERT OR UPDATE'
          WHEN 25 THEN 'BEFORE INSERT OR DELETE'
          WHEN 26 THEN 'AFTER INSERT OR DELETE'
          WHEN 27 THEN 'BEFORE UPDATE OR DELETE'
          WHEN 28 THEN 'AFTER UPDATE OR DELETE'
          WHEN 113 THEN 'BEFORE INSERT OR UPDATE OR DELETE'
          WHEN 114 THEN 'AFTER INSERT OR UPDATE OR DELETE'
          WHEN 8192 THEN 'ON CONNECT'
          WHEN 8193 THEN 'ON DISCONNECT'
          WHEN 8194 THEN 'ON TRANSACTION START'
          WHEN 8195 THEN 'ON TRANSACTION COMMIT'
          WHEN 8196 THEN 'ON TRANSACTION ROLLBACK'
          ELSE 'UNKNOWN'
        ) AS TRIGGER_TYPE
      FROM RDB$TRIGGERS
      WHERE RDB$RELATION_NAME = ?
    `, { params: [table] });

    return result.rows.map((row) => {
      const [, timing, manipulation] = row['TRIGGER_TYPE'].match(/(BEFORE|AFTER|ON) (.+)/);
      return {
        name: row['RDB$TRIGGER_NAME'],
        timing,
        manipulation,
        action: '',
        condition: null,
        table: row['RDB$RELATION_NAME'],
      };
    });
  }

  async listTableIndexes(
    _db: string,
    table: string,
    _schema?: string
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
      WHERE rid.rdb$relation_name = ?
    `, { params: [table] });

    const grouped = _.groupBy(result.rows, "RDB$INDEX_NAME");

    return Object.keys(grouped).map((name) => {
      const blob = grouped[name];
      const order = blob[0]["RDB$INDEX_TYPE"] === 1 ? "DESC" : "ASC";
      const unique = blob[0]["RDB$UNIQUE_FLAG"] === 1;
      const primary =
        blob.findIndex((b) => b["RDB$CONSTRAINT_TYPE"] === "PRIMARY KEY") !==
        -1;
      return {
        id: blob[0]["RDB$INDEX_ID"],
        table: blob[0]["RDB$RELATION_NAME"],
        schema: "",
        name,
        columns: _.sortBy(blob, "RDB$FIELD_POSITION").map((b) => ({
          name: b["RDB$FIELD_NAME"],
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
    // TODO list tables? or databases?
    const result = await this.driverExecuteSingle(`
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$RELATION_TYPE = 0 AND RDB$SYSTEM_FLAG = 0
    `);
    return result.rows;
  }

  async truncateElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    schema?: string
  ): Promise<void> {
    // TODO There is no internal function to truncate a table
  }

  async duplicateTable(
    tableName: string,
    duplicateTableName: string,
    schema?: string
  ): Promise<void> {
    // TODO There is no internal function to duplicate a table
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
    const connection = await this.pool.getConnection();
    const transaction = await connection.transaction();

    try {
      if (changes.inserts) {
        for (const command of buildInsertQueries(this.knex, changes.inserts)) {
          await transaction.query(command)
        }
      }

      if (changes.updates) {
        results = await this.updateValues(transaction, changes.updates);
      }

      if (changes.deletes) {
        for (const command of buildDeleteQueries(this.knex, changes.deletes)) {
          await transaction.query(command)
        }
      }

      await transaction.commit();
    } catch (ex) {
      log.error("query exception: ", ex);
      await transaction.rollback();
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

  async updateValues(
    cli: Connection | Transaction,
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
      const result = await cli.query(blob.query, blob.params);
      results.push(result);
    }

    return results;
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
    const row = result.rows[0];

    return {
      description: row["RDB$DESCRIPTION"],
      size: undefined, // TODO implement size
      indexSize: undefined, // TODO implement indexSize
      indexes: [], // TODO implement indexes
      relations: [], // TODO implement relations
      triggers: [], // TODO implement triggers
      owner: row["RDB$OWNER_NAME"],
      createdAt: undefined, // TODO implement createdAt
    };
  }

  async getTableKeys(db: string, table: string, _schema?: string): Promise<TableKey[]> {
    return []; // TODO
  }


  async executeQuery(
    queryText: string,
    options?: any
  ): Promise<NgQueryResult[]> {
    const result = await this.driverExecuteMultiple(queryText, options);
    return result.map(({ rows: data, statement }) => ({
      fields: [], // TODO implement fields
      affectedRows: undefined, // TODO implement affectedRows
      command: statement.type,
      rows: data ?? [],
      rowCount: data?.length ?? 0,
    }));
  }

  supportedFeatures(): SupportedFeatures {
    return {
      customRoutines: false,
      comments: false,
      properties: false,
      partitions: false,
      editPartitions: false,
    };
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
      rowAsArray?: boolean;
    } = {}
  ): Promise<FirebirdResult | FirebirdResult[]> {
    const queries = identifyCommands(queryText);
    const params = options.params ?? [];

    const results = [];

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];
      const conn = options.connection ?? this.pool;
      const data = await conn.query(query.text, params, options.rowAsArray);

      results.push({
        meta: data.meta,
        result: data.result,
        statement: query,
      });
    }

    return options.multiple ? results : results[0];
  }

  async listMaterializedViewColumns(_db: string, _table: string, _schema?: string): Promise<TableColumn[]> {
    return [] // Doesn't support materialized views
  }

  async listSchemas(_db: string, _filter?: SchemaFilterOptions): Promise<string[]> {
    return []; // Doesn't support schemas
  }

  async getTableReferences(_table: string, _schema?: string): Promise<string[]> {
    return []; // TODO
  }

  getQuerySelectTop(table: string, limit: number, _schema?: string): string {
    return `SELECT FIRST ${limit} * FROM ${table}`;
  }

  getTableCreateScript(_table: string, _schema?: string): Promise<string> {
    // TODO
    // 1. get all columns of a table with their source types
    // 2. use knex to build the query
      throw new Error("Method not implemented.");
  }

  getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
      throw new Error("Method not implemented.");
  }

  getRoutineCreateScript(_routine: string, _type: string, _schema?: string): Promise<string[]> {
      throw new Error("Method not implemented.");
  }

  async truncateAllTables(db: string, _schema?: string): Promise<void> {
    const tables = await this.listTables(db);
    const query = tables.map((table) => `DELETE FROM ${table.name};`).join('');
    await this.driverExecuteSingle(query);
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const result = await this.pool.query(`SELECT COUNT(*) AS TOTAL FROM ${table}`);
    return result[0]['TOTAL'];
  }

  selectTopStream(_db: string, _table: string, _orderBy: OrderBy[], _filters: string | TableFilter[], _chunkSize: number, _schema?: string): Promise<StreamResults> {
      throw new Error("Method not implemented.");
  }

  queryStream(_db: string, _query: string, _chunkSize: number): Promise<StreamResults> {
      throw new Error("Method not implemented.");
  }

  wrapIdentifier(value: string): string {
    return value;
  }

  setTableDescription(_table: string, _description: string, _schema?: string): Promise<string> {
      throw new Error("Method not implemented.");
  }

  duplicateTableSql(_tableName: string, _duplicateTableName: string, _schema?: string): string {
      // TODO There is no native implementation of this
      throw new Error("Method not implemented.");
  }

  listCharsets(): Promise<string[]> {
      throw new Error("Method not implemented.");
  }

  async getDefaultCharset(): Promise<string> {
    return null
  }

  listCollations(_charset: string): Promise<string[]> {
      throw new Error("Method not implemented.");
  }

  createDatabaseSQL(): string {
      throw new Error("Method not implemented.");
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
