import electronLog from "@bksLogger";
import knexlib, { Knex } from "knex";
import Client_Firebird from "@shared/lib/knex-firebird";
import Firebird from "node-firebird";
import { identify } from "sql-query-identifier";
import {
  DatabaseElement,
  IDbConnectionDatabase,
} from "@/lib/db/types";
import {
  CancelableQuery,
  NgQueryResult,
  PrimaryKeyColumn,
  TableChanges,
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
  DatabaseEntity,
  ImportFuncOptions,
  BksField,
  BksFieldType,
} from "@/lib/db/models";
import {
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "@/lib/db/clients/BasicDatabaseClient";
import _ from "lodash";
import { joinFilters } from "@/common/utils";
import { FirebirdChangeBuilder } from "@shared/lib/sql/change_builder/FirebirdChangeBuilder";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import { FirebirdData } from "@shared/lib/dialects/firebird";
import { buildDeleteQueries, buildInsertQueries, buildInsertQuery, errorMessages, withClosable, withReleasable } from "@/lib/db/clients/utils";
import {
  Pool,
  Connection,
  Transaction,
  createDatabase,
} from "./firebird/NodeFirebirdWrapper";
import { IdentifyResult } from "sql-query-identifier/lib/defines";
import { TableKey } from "@shared/lib/dialects/models";
import { FirebirdCursor } from "./firebird/FirebirdCursor";
import { IDbConnectionServer } from "@/lib/db/backendTypes";
import { GenericBinaryTranscoder } from "@/lib/db/serialization/transcoders";
import BksConfig from "@/common/bksConfig";

type FirebirdResult = {
  rows: any[];
  columns: any[];
  statement: IdentifyResult;
  arrayMode: boolean;
};

// Char fields are padded with spaces to the maximum defined length.
// https://stackoverflow.com/a/8343764/10012118
const TRIM_END_CHAR = false;

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

const FIELD_TYPE_QUERY = (
  fieldType: string,
  subType: string,
  fieldScale: string
) => `
  CASE ${fieldType}
    WHEN 7 THEN 'SMALLINT'
    WHEN 8 THEN
      CASE ${subType}
        WHEN 2 THEN 'DECIMAL'
        ELSE 'INTEGER'
      END
    WHEN 10 THEN 'FLOAT'
    WHEN 12 THEN 'DATE'
    WHEN 13 THEN 'TIME'
    WHEN 14 THEN 'CHAR'
    WHEN 16 THEN
      CASE ${fieldScale}
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
  END
`;

function identifyCommands(queryText: string) {
  try {
    return identify(queryText, { strict: false, dialect: "generic" });
  } catch (err) {
    log.error(err);
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
      } else if (item.type.includes('is')) {
        return `${field} ${item.type.toUpperCase()} NULL`;
      }
      return `${field} ${item.type.toUpperCase()} ?`;
    });
    filterString = "WHERE " + joinFilters(allFilters, filters);

    filterParams = filters.filter((filter) => !!filter.value).flatMap((item) => {
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
  {
    columns = [],
    bitConversionFunc = _.toNumber,
    runAsUpsert = false,
    primaryKeys = [],
    createUpsertFunc = null
  } = {}
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

  if (_.intersection(Object.keys(data[0]), primaryKeys).length === primaryKeys.length && runAsUpsert){
    return createUpsertFunc({ schema: insert.schema, name: insert.table, entityType: 'table' }, data, primaryKeys)
  }

  const builder = knex(insert.table);
  if (insert.schema) {
    builder.withSchema(insert.schema);
  }
  const query = builder
    // TODO: try extending the builder instead
    .insert(data[0])
    .toQuery();

  return query
}

function buildInsertQueries(knex: Knex, inserts: TableInsert[], { runAsUpsert = false, primaryKeys = [], createUpsertFunc = null } = {}) {
  return inserts.map((insert) => buildInsertQuery(knex, insert, { runAsUpsert, primaryKeys, createUpsertFunc }));
}

interface FirebirdReservedConnection {
  connection: Connection,
  transaction: Transaction
}

export class FirebirdClient extends BasicDatabaseClient<FirebirdResult, FirebirdReservedConnection> {
  version: any;
  pool: Pool;
  firebirdOptions: Firebird.Options;
  transcoders = [GenericBinaryTranscoder];

  constructor(
    server: IDbConnectionServer,
    database: IDbConnectionDatabase
  ) {
    super(null, context, server, database);
    this.dialect = 'generic';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
    this.createUpsertFunc = this.createUpsertSQL
  }

  async checkIsConnected(): Promise<boolean> {
    try {
      await this.rawExecuteQuery('SELECT 1 FROM RDB$DATABASE');
      return true;
    } catch (_e) {
      return false;
    }
  }

  async versionString(): Promise<string> {
    return this.version;
  }

  async connect(): Promise<void> {
    await super.connect();

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

    this.firebirdOptions = config;

    log.debug("create driver client for firebird with config %j", config);

    this.pool =  new Pool(BksConfig.db.firebird.maxConnections, config);

    const versionResult = await this.driverExecuteSingle(
      "SELECT RDB$GET_CONTEXT('SYSTEM', 'ENGINE_VERSION') from rdb$database;"
    );
    this.version = versionResult.rows[0]["RDB$GET_CONTEXT"];

    const serverConfig = this.server.config;
    const knex = knexlib({
      client: Client_Firebird,
      connection: {
        host: serverConfig.host,
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
    table?: string,
    _schema?: string
  ): Promise<ExtendedTableColumn[]> {
    const result = await this.driverExecuteSingle(
      `
      SELECT
        TRIM(r.rdb$relation_name) rdb$relation_name,
        TRIM(r.rdb$field_name) rdb$field_name,
        f.rdb$field_length rdb$field_length,
        f.rdb$character_length rdb$character_length,
        r.rdb$field_position RDB$FIELD_POSITION,
        r.rdb$description RDB$DESCRIPTION,

        TRIM(${FIELD_TYPE_QUERY(
          "f.rdb$field_type",
          "f.rdb$field_sub_type",
          "f.rdb$field_scale"
        )}) AS field_type,

        f.rdb$field_sub_type rdb$field_sub_type,
        r.rdb$default_source rdb$default_source,
        r.rdb$null_flag RDB$NULL_FLAG,
        (
          SELECT FIRST 1 rc.RDB$CONSTRAINT_TYPE
          FROM RDB$RELATION_CONSTRAINTS rc
          LEFT JOIN rdb$index_segments isg
            ON isg.RDB$FIELD_NAME = r.RDB$FIELD_NAME
          WHERE rc.RDB$INDEX_NAME = isg.RDB$INDEX_NAME
            AND rc.RDB$RELATION_NAME = r.RDB$RELATION_NAME
          GROUP BY rc.RDB$CONSTRAINT_TYPE
        )

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
        ${table ? "AND r.rdb$relation_name = ?" : ""}

      ORDER BY
        rdb$relation_name,
        rdb$field_position
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

        const primaryKey = row["RDB$CONSTRAINT_TYPE"] === "PRIMARY KEY";

        return {
          tableName: row["RDB$RELATION_NAME"],
          columnName: row["RDB$FIELD_NAME"],
          ordinalPosition: row["RDB$FIELD_POSITION"],
          comment: row["RDB$DESCRIPTION"],
          dataType,
          defaultValue,
          nullable,
          primaryKey,
          hasDefault: !_.isNil(defaultValue),
          bksField: this.parseTableColumn(row),
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
      SELECT TRIM(RDB$RELATION_NAME) AS RELATION_NAME
        FROM RDB$RELATIONS
      WHERE RDB$VIEW_BLR IS NOT NULL
        AND (RDB$SYSTEM_FLAG IS NULL OR RDB$SYSTEM_FLAG = 0);
    `);
    return result.rows.map((row) => ({
      name: row["RELATION_NAME"],
      entityType: "view",
    }));
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    const results = await this.driverExecuteMultiple(`
      SELECT
        TRIM(RDB$PROCEDURE_ID) AS ROUTINE_ID,
        TRIM(RDB$PROCEDURE_NAME) AS ROUTINE_NAME,
        TRIM('procedure') AS ROUTINE_TYPE,
        NULL AS RETURN_ARG
      FROM RDB$PROCEDURES
      UNION ALL
      SELECT
        TRIM(RDB$FUNCTION_ID) AS ROUTINE_ID,
        TRIM(RDB$FUNCTION_NAME) AS ROUTINE_NAME,
        TRIM('function') AS ROUTINE_TYPE,
        RDB$RETURN_ARGUMENT AS RETURN_ARG
      FROM RDB$FUNCTIONS;

      SELECT
        TRIM(RDB$PARAMETER_NAME) AS PARAMETER_NAME,
        TRIM(RDB$PROCEDURE_NAME) AS ROUTINE_NAME,
        TRIM(CASE RDB$PARAMETER_TYPE
          WHEN 0 THEN 'in'
          WHEN 1 THEN 'out'
        END) AS PARAMETER_TYPE,
        TRIM('procedure') AS ROUTINE_TYPE,
        NULL AS ARGUMENT_POSITION
      FROM RDB$PROCEDURE_PARAMETERS
      UNION ALL
      SELECT
        TRIM(RDB$ARGUMENT_NAME) AS PARAMETER_NAME,
        TRIM(RDB$FUNCTION_NAME) AS ROUTINE_NAME,
        (
          SELECT TRIM(${FIELD_TYPE_QUERY(
            "fl.RDB$FIELD_TYPE",
            "fl.RDB$FIELD_SUB_TYPE",
            "fl.RDB$FIELD_SCALE"
          )})
          FROM RDB$FIELDS fl
          WHERE fl.RDB$FIELD_NAME = RDB$FIELD_SOURCE
        ) AS PARAMETER_TYPE, -- TODO handle legacy types too
        TRIM('function') AS ROUTINE_TYPE,
        RDB$ARGUMENT_POSITION AS ARGUMENT_POSITION
      FROM RDB$FUNCTION_ARGUMENTS;
    `);

    const routines = results[0].rows;
    const params = results[1].rows;

    return routines.map((routine) => {
      const id = routine["ROUTINE_ID"];
      const name = routine["ROUTINE_NAME"];
      const type = routine["ROUTINE_TYPE"];
      const returnType =
        type === "function"
          ? params.find(
              (param) =>
                param["ROUTINE_NAME"] === routine["ROUTINE_NAME"] &&
                param["ARGUMENT_POSITION"] === routine["RETURN_ARG"]
            )?.PARAMETER_TYPE
          : undefined;

      const routineParams = params
        .filter(
          (param) =>
            param["ROUTINE_NAME"] === routine["ROUTINE_NAME"] &&
            param["ROUTINE_TYPE"] === routine["ROUTINE_TYPE"] &&
            param["PARAMETER_NAME"] !== null
        )
        .map((param) => ({
          name: param["PARAMETER_NAME"],
          type: param["PARAMETER_TYPE"],
        }));

      return {
        id,
        name,
        type,
        returnType,
        entityType: "routine",
        routineParams,
      };
    });
  }

  async getPrimaryKey(
    table: string,
    _schema?: string
  ): Promise<string | null> {
    const columns = await this.getPrimaryKeys(table, _schema);
    return columns[0]?.columnName ?? null;
  }

  async getPrimaryKeys(
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
    const fields = this.parseQueryResultColumns(result);
    const rows = await this.serializeQueryResult(result, fields);

    return { result: rows, fields };
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

  static buildSelectTopQuery(
    table: string,
    offset?: number,
    limit?: number,
    orderBy?: OrderBy[],
    filters: string | TableFilter[] = [],
    countTitle = "total",
    selects: string[] = ["*"]
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

  async query(queryText: string, tabId: number): Promise<CancelableQuery> {
    let connection: Connection | Transaction | undefined;
    const hasReserved = this.reservedConnections.has(tabId);

    return {
      execute: async () => {
        connection = hasReserved ? this.peekConnection(tabId).transaction : await this.pool.getConnection()

        try {
          return this.executeQuery(queryText, { rowAsArray: true, connection, tabId })
        } finally {
          // release happens in rawExecuteQuery, not needed here
          // await connection.release();
        }

      },
      cancel: async () => {
        try {
          if (!hasReserved && connection instanceof Connection) {
            await connection?.release();
          }
        } catch (ex) {
          log.warn("Unable to release connection", ex.message)
        }
      },
    };
  }

  async getInsertQuery(tableInsert: TableInsert, runAsUpsert = false): Promise<string> {
    if (tableInsert.data.length > 1) {
      // TODO: We can't insert multiple rows at once with Firebird. And
      // firebird knex only accepts an object instead of an array, while the
      // other dialects accept arrays. So this must be handled in knex instead?
      throw new Error("Inserting multiple rows is not supported.");
    }
    const primaryKeysPromise = await this.getPrimaryKeys(tableInsert.table, tableInsert.schema)
    const primaryKeys = primaryKeysPromise.map(v => v.columnName)
    const columns = await this.listTableColumns(
      tableInsert.table,
      tableInsert.schema
    );
    return buildInsertQuery(this.knex, tableInsert, { columns, runAsUpsert, primaryKeys, createUpsertFunc: this.createUpsertFunc });
  }

  async listTableTriggers(
    table: string,
    _schema?: string
  ): Promise<TableTrigger[]> {
    // Refs
    // Trigger type - https://firebirdsql.org/file/documentation/html/en/refdocs/fblangref40/firebird-40-language-reference.html#fblangref-appx04-triggers-type
    const result = await this.driverExecuteSingle(
      `
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
        END) AS TRIGGER_TYPE
      FROM RDB$TRIGGERS
      WHERE RDB$RELATION_NAME = ?
    `,
      { params: [table] }
    );

    return result.rows.map((row) => {
      const [, timing, manipulation] = row["TRIGGER_TYPE"].match(
        /(BEFORE|AFTER|ON) (.+)/
      );
      return {
        name: row["RDB$TRIGGER_NAME"],
        timing,
        manipulation,
        action: "",
        condition: null,
        table: row["RDB$RELATION_NAME"],
      };
    });
  }

  async listTableIndexes(
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const result = await this.driverExecuteSingle(
      `
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
        AND rid.rdb$relation_name = ?
    `,
      { params: [table.toUpperCase()] }
    );

    const grouped = _.groupBy(result.rows, "RDB$INDEX_NAME");

    return Object.keys(grouped).map((name) => {
      const blob = grouped[name];
      const order = blob[0]["RDB$INDEX_TYPE"] === 1 ? "DESC" : "ASC";
      const uniqueFlag = blob[0]["RDB$UNIQUE_FLAG"];
      // Handle different types that might be returned by the driver
      const unique = uniqueFlag === 1 || uniqueFlag === true || uniqueFlag === '1';
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

  async setElementNameSql(): Promise<string> {
    // Firebird doesn't support renaming tables or any database elements we
    // support. https://www.firebirdfaq.org/faq363/
    return '';
  }

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    _schema?: string
  ): Promise<void> {
    await this.driverExecuteSingle(`DROP ${typeOfElement} ${elementName}`);
  }

  async listDatabases(_filter?: DatabaseFilterOptions): Promise<string[]> {
    return [this.database.database];
  }

  // TODO There is no internal function to truncate a table
  async truncateElementSql() {
    return ''
  }

  async duplicateTable(
    _tableName: string,
    _duplicateTableName: string,
    _schema?: string
  ): Promise<void> {
    // TODO There is no internal function to duplicate a table
  }

  async createDatabase(
    databaseName: string,
    _charset: string,
    _collation: string
  ): Promise<string> {
    databaseName = databaseName.trimEnd();
    if (!databaseName.endsWith(".fdb")) {
      databaseName += ".fdb";
    }
    await createDatabase({
      host: this.server.config.host,
      port: this.server.config.port,
      database: databaseName,
      user: this.server.config.user,
      password: this.server.config.password,
      // encoding: charset,
    });
    return databaseName;
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];
    const connection = await this.pool.getConnection();
    const transaction = await connection.transaction();
    try {
      if (changes.inserts) {
        for (const command of buildInsertQueries(this.knex, changes.inserts)) {
          await transaction.query(command);
        }
      }

      if (changes.updates) {
        results = await this.updateValues(transaction, changes.updates);
      }

      if (changes.deletes) {
        for (const command of buildDeleteQueries(this.knex, changes.deletes)) {
          await transaction.query(command);
        }
      }
      await transaction.commit();
      return results;
    } catch (ex) {
      log.error("query exception: ", ex);
      await transaction.rollback();
      throw ex;
    } finally {
      await connection.release()
    }
  }

  async updateValues(
    cli: Connection | Transaction,
    updates: TableUpdate[]
  ): Promise<TableUpdateResult[]> {
    const results = [];

    for (const update of updates) {
      const updateParam = _.isBoolean(update.value) ? _.toInteger(update.value) : update.value

      const whereList = [];
      const whereParams = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${FirebirdData.wrapIdentifier(column)} = ?`);
        whereParams.push(value);
      });

      const where = whereList.join(" AND ");

      const updateQuery = `
        UPDATE ${update.table} SET ${update.column} = ?
        WHERE ${where}
      `;
      const selectQuery = `SELECT * FROM ${update.table} WHERE ${where}`;

      await cli.query(updateQuery, [updateParam, ...whereParams]);
      const result = await cli.query(selectQuery, whereParams);
      results.push(result.rows[0]);
    }

    return results;
  }

  async getTableProperties(
    table: string,
    _schema?: string
  ): Promise<TableProperties> {
    const info = this.driverExecuteSingle(
      `
        SELECT
          RDB$DESCRIPTION,
          RDB$OWNER_NAME,
          (SELECT COUNT(*) AS SIZE FROM ${table})
        FROM rdb$relations
        WHERE rdb$relation_name = ${Firebird.escape(table)}
      `
    ).then((result) => result.rows[0]);
    const indexes = this.listTableIndexes(table);
    const relations = this.getTableKeys(table);
    const triggers = this.listTableTriggers(table);

    return {
      description: await info["RDB$DESCRIPTION"],
      size: await info["SIZE"],
      indexSize: undefined, // TODO
      indexes: await indexes,
      relations: await relations,
      triggers: await triggers,
      partitions: [],
      owner: await info["RDB$OWNER_NAME"],
      createdAt: undefined, // TODO
    };
  }

  async getOutgoingKeys(
    table: string,
    _schema?: string
  ): Promise<TableKey[]> {
    // Query for foreign keys FROM this table (outgoing - referencing other tables)
    const result = await this.driverExecuteSingle(
      `
        SELECT
          TRIM(PK.RDB$RELATION_NAME) AS TO_TABLE,
          TRIM(ISP.RDB$FIELD_NAME) AS TO_COLUMN,
          TRIM(FK.RDB$RELATION_NAME) AS FROM_TABLE,
          TRIM(ISF.RDB$FIELD_NAME) AS FROM_COLUMN,
          TRIM(FK.RDB$CONSTRAINT_NAME) AS CONSTRAINT_NAME,
          TRIM(RC.RDB$UPDATE_RULE) AS ON_UPDATE,
          TRIM(RC.RDB$DELETE_RULE) AS ON_DELETE,
          ISF.RDB$FIELD_POSITION AS FIELD_POSITION
        FROM
          RDB$RELATION_CONSTRAINTS PK
          JOIN RDB$REF_CONSTRAINTS RC ON PK.RDB$CONSTRAINT_NAME = RC.RDB$CONST_NAME_UQ
          JOIN RDB$RELATION_CONSTRAINTS FK ON FK.RDB$CONSTRAINT_NAME = RC.RDB$CONSTRAINT_NAME
          JOIN RDB$INDEX_SEGMENTS ISF ON ISF.RDB$INDEX_NAME = FK.RDB$INDEX_NAME
          JOIN RDB$INDEX_SEGMENTS ISP ON ISP.RDB$INDEX_NAME = PK.RDB$INDEX_NAME AND ISP.RDB$FIELD_POSITION = ISF.RDB$FIELD_POSITION
        WHERE
          FK.RDB$RELATION_NAME = ?
          AND FK.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND PK.RDB$CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY
          CONSTRAINT_NAME,
          ISF.RDB$FIELD_POSITION
    `,
      { params: [table.toUpperCase()] }
    );

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(result.rows, "CONSTRAINT_NAME");

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key (backward compatibility)
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          fromTable: row["FROM_TABLE"],
          fromColumn: row["FROM_COLUMN"],
          fromSchema: "",
          toTable: row["TO_TABLE"],
          toColumn: row["TO_COLUMN"],
          toSchema: "",
          constraintName: row["CONSTRAINT_NAME"],
          onUpdate: row["ON_UPDATE"],
          onDelete: row["ON_DELETE"],
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        fromTable: firstPart["FROM_TABLE"],
        fromColumn: keyParts.map(p => p["FROM_COLUMN"]),
        fromSchema: "",
        toTable: firstPart["TO_TABLE"],
        toColumn: keyParts.map(p => p["TO_COLUMN"]),
        toSchema: "",
        constraintName: firstPart["CONSTRAINT_NAME"],
        onUpdate: firstPart["ON_UPDATE"],
        onDelete: firstPart["ON_DELETE"],
        isComposite: true
      };
    });
  }

  async getIncomingKeys(
    table: string,
    _schema?: string
  ): Promise<TableKey[]> {
    // Query for foreign keys TO this table (incoming - other tables referencing this table)
    const incomingSQL = `
        SELECT
          TRIM(PK.RDB$RELATION_NAME) AS TO_TABLE,
          TRIM(ISP.RDB$FIELD_NAME) AS TO_COLUMN,
          TRIM(FK.RDB$RELATION_NAME) AS FROM_TABLE,
          TRIM(ISF.RDB$FIELD_NAME) AS FROM_COLUMN,
          TRIM(FK.RDB$CONSTRAINT_NAME) AS CONSTRAINT_NAME,
          TRIM(RC.RDB$UPDATE_RULE) AS ON_UPDATE,
          TRIM(RC.RDB$DELETE_RULE) AS ON_DELETE,
          ISF.RDB$FIELD_POSITION AS FIELD_POSITION
        FROM
          RDB$RELATION_CONSTRAINTS PK
          JOIN RDB$REF_CONSTRAINTS RC ON PK.RDB$CONSTRAINT_NAME = RC.RDB$CONST_NAME_UQ
          JOIN RDB$RELATION_CONSTRAINTS FK ON FK.RDB$CONSTRAINT_NAME = RC.RDB$CONSTRAINT_NAME
          JOIN RDB$INDEX_SEGMENTS ISF ON ISF.RDB$INDEX_NAME = FK.RDB$INDEX_NAME
          JOIN RDB$INDEX_SEGMENTS ISP ON ISP.RDB$INDEX_NAME = PK.RDB$INDEX_NAME AND ISP.RDB$FIELD_POSITION = ISF.RDB$FIELD_POSITION
        WHERE
          PK.RDB$RELATION_NAME = ?
          AND FK.RDB$CONSTRAINT_TYPE = 'FOREIGN KEY'
          AND PK.RDB$CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY
          CONSTRAINT_NAME,
          ISF.RDB$FIELD_POSITION
    `;

    const result = await this.driverExecuteSingle(incomingSQL, { params: [table.toUpperCase()] });

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(result.rows, "CONSTRAINT_NAME");

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key (backward compatibility)
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          fromTable: row["FROM_TABLE"],
          fromColumn: row["FROM_COLUMN"],
          fromSchema: "",
          toTable: row["TO_TABLE"],
          toColumn: row["TO_COLUMN"],
          toSchema: "",
          constraintName: row["CONSTRAINT_NAME"],
          onUpdate: row["ON_UPDATE"],
          onDelete: row["ON_DELETE"],
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        fromTable: firstPart["FROM_TABLE"],
        fromColumn: keyParts.map(p => p["FROM_COLUMN"]),
        fromSchema: "",
        toTable: firstPart["TO_TABLE"],
        toColumn: keyParts.map(p => p["TO_COLUMN"]),
        toSchema: "",
        constraintName: firstPart["CONSTRAINT_NAME"],
        onUpdate: firstPart["ON_UPDATE"],
        onDelete: firstPart["ON_DELETE"],
        isComposite: true,
      };
    });
  }

  async executeQuery(
    queryText: string,
    options?: any
  ): Promise<NgQueryResult[]> {
    const result = await this.driverExecuteMultiple(queryText, options);
    return result.map(({ rows, statement, columns: meta }) => {
      const fields = meta.map((field, idx) => ({
        id: `c${idx}`,
        name: field.alias || field.field,
        // TODO add dataType prop
      }));

      rows = rows.map((row: Record<string, any>) => {
        const transformedRow = {};
        Object.keys(row).forEach((key, idx) => {
          let val = row[key];
          if (TRIM_END_CHAR && meta[idx].type === 452) {
            // SQLVarText or CHAR
            val = val.trimEnd();
          }
          transformedRow[`c${idx}`] = val;
        });
        return transformedRow;
      });

      return {
        fields,
        rows,
        affectedRows: undefined, // TODO implement affectedRows
        command: statement.type,
        rowCount: rows.length,
      };
    });
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: false,
      comments: false,
      properties: false,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: true,
      filterTypes: ['standard']
    };
  }

  async disconnect(): Promise<void> {
    this.pool.destroy();

    await super.disconnect();
  }

  protected async rawExecuteQuery(
    queryText: string,
    options: {
      connection?: Connection | Transaction;
      multiple?: boolean;
      params?: any[];
      rowAsArray?: boolean;
      tabId?: number;
    } = {}
  ): Promise<FirebirdResult | FirebirdResult[]> {
    const queries = identifyCommands(queryText);
    const params = options.params ?? [];

    const results: FirebirdResult[] = [];
    const hasReserved = this.reservedConnections.has(options.tabId);
    const conn = options.connection ?? await this.pool.getConnection()

    // we do it this way to ensure the queries are run IN ORDER
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];

      const runQuery = async () => {
        const data = await conn.query(query.text, params, options.rowAsArray);
        results.push({
          columns: data.meta,
          rows: data.rows,
          statement: query,
          arrayMode: options.rowAsArray,
        });
      };

      await runQuery();
    }

    if (!hasReserved && conn instanceof Connection) {
      conn.release();
    }

    return options.multiple ? results : results[0];
  }

  async listMaterializedViewColumns(
    _table: string,
    _schema?: string
  ): Promise<TableColumn[]> {
    return []; // Doesn't support materialized views
  }

  async listSchemas(
    _filter?: SchemaFilterOptions
  ): Promise<string[]> {
    return []; // Doesn't support schemas
  }

  async getTableReferences(
    _table: string,
    _schema?: string
  ): Promise<string[]> {
    return []; // TODO
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT FIRST ${limit} * FROM ${table}`;
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const columns = await this.listTableColumns(table);
    const columnsQuery = columns
      .map((column) => {
        const defaultValue = column.defaultValue
          ? `DEFAULT ${column.defaultValue}`
          : "";
        const nullable = column.nullable ? "" : "NOT NULL";
        const primaryKey = column.primaryKey ? "PRIMARY KEY" : "";
        return `${column.columnName} ${column.dataType} ${defaultValue} ${nullable} ${primaryKey}`;
      })
      .join(",");
    return `CREATE TABLE ${table} (${columnsQuery})`;
  }

  getViewCreateScript(_view: string, _schema?: string): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  getRoutineCreateScript(
    _routine: string,
    _type: string,
    _schema?: string
  ): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  async truncateAllTables(_schema?: string): Promise<void> {
    const tables = await this.listTables();
    const query = tables.map((table) => `DELETE FROM ${table.name};`).join("");
    await this.driverExecuteSingle(query);
  }

  async getTableLength(table: string, _schema?: string): Promise<number> {
    const result = await this.driverExecuteSingle(
      `SELECT COUNT(*) AS TOTAL FROM ${table}`
    );
    return result.rows[0]["TOTAL"];
  }

  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number,
    _schema?: string
  ): Promise<StreamResults> {
    const columns = this.listTableColumns(table);
    const totalRows = this.getTableLength(table);
    const cursor = new FirebirdCursor({
      config: this.firebirdOptions,
      table,
      orderBy,
      filters,
      chunkSize,
    });

    return {
      columns: await columns,
      totalRows: await totalRows,
      cursor,
    };
  }

  queryStream(
    _query: string,
    _chunkSize: number
  ): Promise<StreamResults> {
    throw new Error("Method not implemented.");
  }

  wrapIdentifier(value: string): string {
    // No need to wrap. Firebird identifiers are case-insensitive and do not
    // allow special characters except _ and $.
    return value;
  }

  async setTableDescription(
    table: string,
    description: string,
    _schema?: string
  ): Promise<string> {
    await this.driverExecuteSingle(
      `COMMENT ON TABLE ${table} IS ${Firebird.escape(description)}`
    );
    return description;
  }

  async duplicateTableSql(
    _tableName: string,
    _duplicateTableName: string,
    _schema?: string
  ): Promise<string> {
    // TODO There is no native implementation of this
    throw new Error("Method not implemented.");
  }

  async listCharsets(): Promise<string[]> {
    // const result = await this.driverExecuteSingle(
    //   "SELECT TRIM(RDB$CHARACTER_SET_NAME) AS CHARSET FROM RDB$CHARACTER_SETS"
    // );
    // return result.rows.map((row) => row["CHARSET"]);
    return ["UTF8"]; // NOTE: node-firebird only let us to use UTF8
  }

  async getDefaultCharset(): Promise<string> {
    return "UTF8";
  }

  async listCollations(_charset: string): Promise<string[]> {
    // const result = await this.driverExecuteSingle(
    //   ` SELECT * FROM RDB$COLLATIONS cl
    //     JOIN RDB$CHARACTER_SETS cs
    //     ON cl.RDB$CHARACTER_SET_ID = cs.RDB$CHARACTER_SET_ID
    //     WHERE cs.RDB$CHARACTER_SET_NAME = ?`,
    //   { params: [charset] }
    // );
    // return result.rows.map((row) => row["RDB$COLLATION_NAME"]);
    return [];
  }

  // took this approach because Typescript wasn't liking the base function could be a null value or a function
  createUpsertSQL({ name: tableName }: DatabaseEntity, data: {[key: string]: any}, primaryKeys: string[]): string {
    const [PK] = primaryKeys
    const columnsWithoutPK = _.without(Object.keys(data[0]), PK)
    const insertSQL = () => `
      INSERT ("${PK}", ${columnsWithoutPK.map(cpk => `"${cpk}"`).join(', ')})
      VALUES (source."${PK}", ${columnsWithoutPK.map(cpk => `source."${cpk}"`).join(', ')})
    `.trim()
    const updateSet = () => `${columnsWithoutPK.map(cpk => `"${cpk}" = source."${cpk}"`).join(', ')}`
    const formatValue = (val) => _.isString(val) ? `'${val}'` : val
    const usingSQLStatement = data.map( (val, idx) => {
      if (idx === 0) {
        return `SELECT ${formatValue(val[PK])} AS "${PK}", ${columnsWithoutPK.map(col => `${formatValue(val[col])} AS "${col}"`).join(', ')} FROM RDB$DATABASE`
      }
      return `SELECT ${formatValue(val[PK])}, ${columnsWithoutPK.map(col => `${formatValue(val[col])}`).join(', ')} FROM RDB$DATABASE`
    })
    .join(' UNION ALL ')

    return `
      MERGE INTO "${tableName}" AS target
      USING (
        ${usingSQLStatement}
      ) AS source
      ON (target."${PK}" = source."${PK}")
      WHEN MATCHED THEN
        UPDATE SET
          ${updateSet()}
      WHEN NOT MATCHED THEN
        ${insertSQL()};
    `.trim()
  }

  async createDatabaseSQL(): Promise<string> {
    throw new Error("Method not implemented.");
  }

  protected async runWithConnection(child: (connection: Connection) => Promise<any>):  Promise<any> {
    const connection = await this.pool.getConnection();

    try {
      return await child(connection);
    } finally {
      await connection.release()
    }
  }

  async getImportSQL(importedData: TableInsert[], tableName: string, _schema = null, runAsUpsert = false): Promise<string[]> {
    const primaryKeysPromise = await this.getPrimaryKeys(tableName)
    const primaryKeys = primaryKeysPromise.map(v => v.columnName)
    return buildInsertQueries(this.knex, importedData, { runAsUpsert, primaryKeys, createUpsertFunc: this.createUpsertFunc })
  }

  async importStepZero(_table: TableOrView, options: { connection: Connection }): Promise<any> {
    const transaction = await options.connection.transaction()

    return {
      transaction
    }
  }

  async importTruncateCommand (table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    const { name } = table

    return await clientExtras.transaction.query(`DELETE FROM ${this.wrapIdentifier(name)};`)
  }

  async importLineReadCommand (_table: TableOrView, sqlString: string[], { executeOptions }: ImportFuncOptions): Promise<any> {
    for (const sql of sqlString) {
      await executeOptions.transaction.query(`${sql};`);
    }
  }

  async importCommitCommand (_table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    // NOTE (@day): this seems to be crashing
    return await clientExtras.transaction.commit()
  }

  async importRollbackCommand (_table: TableOrView, { clientExtras }: ImportFuncOptions): Promise<any> {
    return await clientExtras.transaction.rollback()
  }

  async reserveConnection(tabId: number): Promise<void> {
    this.throwIfHasConnection(tabId);

    if (this.reservedConnections.size >= BksConfig.db.firebird.maxReservedConnections) {
      throw new Error(errorMessages.maxReservedConnections);
    }

    const conn = await this.pool.getConnection();
    this.pushConnection(tabId, { connection: conn, transaction: null });
  }

  async releaseConnection(tabId: number): Promise<void> {
    const conn = this.popConnection(tabId);
    if (conn) {
      try {
        if (conn.transaction) {
          await conn.transaction.rollback();
        }
        await conn.connection.release();
      } catch (e) {
        log.error("Error releasing reserved firebird connection: ", e)
      }
    }
  }

  async startTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    conn.transaction = await conn.connection.transaction();
  }

  async commitTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await conn.transaction.commit();
    conn.transaction = null;
  }

  async rollbackTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await conn.transaction.rollback();
    conn.transaction = null;
  }

  parseQueryResultColumns(qr: FirebirdResult): BksField[] {
    return qr.columns.map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';
      // 520 is SQL_BLOB
      // Ref: https://github.com/hgourvest/node-firebird/blob/3aba6c3bb605c9e4a260a572d6395d1b431dee8a/lib/wire/const.js#L230
      if (column.type === 520) {
        bksType = 'BINARY';
      }
      return { name: column.field, bksType };
    });
  }

  parseTableColumn(column: { FIELD_TYPE: string, RDB$FIELD_NAME: string }): BksField {
    return {
      name: column.RDB$FIELD_NAME,
      bksType: column.FIELD_TYPE === "BLOB" ? "BINARY" : "UNKNOWN",
    };
  }
}
