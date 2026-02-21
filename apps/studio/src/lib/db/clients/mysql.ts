// Copyright (c) 2015 The SQLECTRON Team

import {
  AppContextProvider,
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "./BasicDatabaseClient";
import mysql, { Connection } from "mysql2";
import rawLog from "@bksLogger";
import ed25519AuthPlugin from "@coresql/mysql2-auth-ed25519";
import knexlib from "knex";
import { readFileSync } from "fs";
import _ from "lodash";
import {
  buildDeleteQueries,
  buildInsertQuery,
  buildSelectTopQuery,
  escapeString,
  ClientError, refreshTokenIfNeeded,
  errorMessages
} from "./utils";
import {
  IDbConnectionDatabase,
  DatabaseElement,
} from "../types";
import { MysqlCursor } from "./mysql/MySqlCursor";
import {createCancelablePromise} from "@/common/utils";
import { errors } from "@/lib/errors";
import { identify } from "sql-query-identifier";
import { MySqlChangeBuilder } from "@shared/lib/sql/change_builder/MysqlChangeBuilder";
import { AlterTableSpec, IndexColumn, TableKey } from "@shared/lib/dialects/models";
import { MysqlData } from "@shared/lib/dialects/mysql";
import {
  CancelableQuery,
  DatabaseFilterOptions,
  ExtendedTableColumn,
  FilterOptions,
  ImportFuncOptions,
  NgQueryResult,
  OrderBy,
  PrimaryKeyColumn,
  QueryResult,
  Routine,
  SchemaFilterOptions,
  ServerStatistics,
  StreamResults,
  SupportedFeatures,
  TableChanges,
  TableColumn,
  TableDelete,
  BksField,
  BksFieldType,
  TableFilter,
  TableIndex,
  TableInsert,
  TableOrView,
  TableProperties,
  TableResult,
  TableTrigger,
  TableUpdate,
} from "../models";
import { ChangeBuilderBase } from "@shared/lib/sql/change_builder/ChangeBuilderBase";
import BksConfig from "@/common/bksConfig";
import { uuidv4 } from "@/lib/uuid";
import { IDbConnectionServer } from "../backendTypes";
import { GenericBinaryTranscoder } from "../serialization/transcoders";
import { Version, isVersionLessThanOrEqual, parseVersion } from "@/common/version";
import globals from '../../../common/globals';
import {AzureAuthService} from "@/lib/db/authentication/azure";

type ResultType = {
  tableName?: string
  rows: any[];
  columns: mysql.FieldPacket[];
  arrayMode: boolean;
};

const log = rawLog.scope("mysql");
const logger = () => log;

const context: AppContextProvider = {
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

const mysqlErrors = {
  EMPTY_QUERY: "ER_EMPTY_QUERY",
  CONNECTION_LOST: "PROTOCOL_CONNECTION_LOST",
};

const knex = knexlib({ client: "mysql2" });

function getRealError(conn, err) {
  /* eslint no-underscore-dangle:0 */
  if (conn && conn._protocol && conn._protocol._fatalError) {
    logger().warn("Query error", err, conn._protocol._fatalError);
    return conn._protocol._fatalError;
  }
  return err;
}

const binaryTypes = [
  mysql.Types.STRING, // aka CHAR or BINARY
  mysql.Types.VAR_STRING, // aka VARCHAR or VARBINARY
  mysql.Types.TINY_BLOB,
  mysql.Types.BLOB,
  mysql.Types.MEDIUM_BLOB,
  mysql.Types.LONG_BLOB,
]

const binaryDataTypes = [
  'binary',
  'varbinary',
  'tinyblob',
  'blob',
  'mediumblob',
  'longblob',
]

// Ref: https://github.com/sidorares/node-mysql2/blob/master/lib/constants/field_flags.js
const FieldFlags = {
  BINARY: 128,
};

async function configDatabase(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase
): Promise<mysql.PoolOptions> {

  let iamToken = undefined;
  if(server.config.iamAuthOptions?.iamAuthenticationEnabled){
      iamToken = await refreshTokenIfNeeded(server.config?.iamAuthOptions, server, server.config.port || 5432)
  }

  const config: mysql.PoolOptions = {
    authPlugins: {
      'client_ed25519': ed25519AuthPlugin(),
    },
    host: server.config.host,
    port: server.config.port,
    user: server.config.user,
    password: iamToken || server.config.password || undefined,
    database: database.database,
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectionLimit: BksConfig.db.mysql.maxConnections,
    connectTimeout: BksConfig.db.mysql.connectTimeout,
  };

  if (server.config.azureAuthOptions?.azureAuthEnabled) {
    const authService = new AzureAuthService();
    return authService.configDB(server, config)
  }

  if (server.config.socketPathEnabled) {
    config.socketPath = server.config.socketPath;
    config.host = null;
    config.port = null;
    return config;
  }

  if (server.sshTunnel) {
    config.host = server.config.localHost;
    config.port = server.config.localPort;
  }

  if (
    server.config.iamAuthOptions?.iamAuthenticationEnabled
  ){
    server.config.ssl = true
  }

  if (server.config.ssl) {
    config.ssl = {};

    if (server.config.sslCaFile) {
      /* eslint-disable-next-line */
      // @ts-ignore
      config.ssl.ca = readFileSync(server.config.sslCaFile);
    }

    if (server.config.sslCertFile) {
      /* eslint-disable-next-line */
      // @ts-ignore
      config.ssl.cert = readFileSync(server.config.sslCertFile);
    }

    if (server.config.sslKeyFile) {
      /* eslint-disable-next-line */
      // @ts-ignore
      config.ssl.key = readFileSync(server.config.sslKeyFile);
    }

    if (!config.ssl.key && !config.ssl.ca && !config.ssl.cert) {
      // TODO: provide this as an option in settings
      // or per-connection as 'reject self-signed certs'
      // How it works:
      // if false, cert can be self-signed
      // if true, has to be from a public CA
      // Heroku certs are self-signed.
      // if you provide ca/cert/key files, it overrides this
      config.ssl.rejectUnauthorized = false;
    } else {
      config.ssl.rejectUnauthorized = server.config.sslRejectUnauthorized;
    }
  }

  return config;
}

function identifyCommands(queryText: string) {
  try {
    return identify(queryText);
  } catch (err) {
    return [];
  }
}

function isMultipleQuery(fields: any[]) {
  if (!fields) {
    return false;
  }
  if (!fields.length) {
    return false;
  }
  return Array.isArray(fields[0]) || fields[0] === undefined;
}

function parseFields(fields: any[], rowsAsArray?: boolean) {
  if (!fields) return [];
  return fields.map((field, idx) => {
    return { id: rowsAsArray ? `c${idx}` : field.name, ...field };
  });
}

function parseRowQueryResult(
  data: any,
  rawFields: any[],
  command: string,
  rowsAsArray = false
) {
  // Fallback in case the identifier could not reconize the command
  const fields = parseFields(rawFields, rowsAsArray);
  const fieldIds = fields.map((f) => f.id);
  const isSelect = Array.isArray(data);
  return {
    command: command || (isSelect && "SELECT"),
    rows: isSelect
      ? data.map((r: any) => (rowsAsArray ? _.zipObject(fieldIds, r) : r))
      : [],
    fields: fields,
    rowCount: isSelect ? (data || []).length : undefined,
    affectedRows: !isSelect ? data.affectedRows : undefined,
  };
}

function filterDatabase(
  item: Record<string, any>,
  { database }: DatabaseFilterOptions = {},
  databaseField: string
) {
  if (!database) {
    return true;
  }

  const value = item[databaseField];
  if (typeof database === "string") {
    return database === value;
  }

  const { only, ignore } = database;

  /* eslint-disable-next-line */
  // @ts-ignore
  if (only && only.length && !~only.indexOf(value)) {
    return false;
  }

  /* eslint-disable-next-line */
  // @ts-ignore
  if (ignore && ignore.length && ~ignore.indexOf(value)) {
    return false;
  }

  return true;
}

export class MysqlClient extends BasicDatabaseClient<ResultType, mysql.PoolConnection> {
  versionInfo: Version & {
    versionString: string;
    version: number;
  };
  conn: {
    pool: mysql.Pool;
  };
  transcoders = [GenericBinaryTranscoder];

  interval: NodeJS.Timeout

  clientId: string

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, context, server, database);
    this.clientId = uuidv4();

    this.dialect = 'mysql';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect() {
    await super.connect();
    const dbConfig = await configDatabase(this.server, this.database);
    logger().debug("create driver client for mysql with config %j", dbConfig);

    this.conn = {
      pool: mysql.createPool(dbConfig),
    };

    if(this.server.config.iamAuthOptions?.iamAuthenticationEnabled){
      this.interval = setInterval(async () => {
        try {
          this.conn.pool.getConnection(async (err, connection) => {
            if(err) throw err;
            connection.config.password = await refreshTokenIfNeeded(this.server.config.iamAuthOptions, this.server, this.server.config.port || 3306)
            connection.release();
            log.info('Token refreshed successfully.')
          });
        } catch (err) {
          log.error('Could not refresh token!')
        }
      }, globals.iamRefreshTime);
    }

    this.conn.pool.on('acquire', (connection) => {
      log.debug('Pool connection %d acquired on %s', connection.threadId, this.clientId);
    });

    this.conn.pool.on('release', (connection) => {
      log.debug('Pool connection %d released on %s', connection.threadId, this.clientId);
    });


    this.versionInfo = await this.getVersion();
  }

  async disconnect() {
    if(this.interval){
      clearInterval(this.interval);
    }
    this.conn?.pool.end();

    await super.disconnect();
  }

  async versionString() {
    return this.versionInfo?.versionString;
  }

  async getVersion() {
    const { rows } = await this.driverExecuteSingle("SELECT VERSION() as v");
    const version = rows[0]["v"];
    if (!version) {
      return {
        versionString: "",
        version: 5.7,
        major: 5,
        minor: 7,
        patch: 0,
      };
    }

    const stuff = version.split("-");
    const { major, minor, patch } = parseVersion(stuff[0]);

    return {
      versionString: version,
      version: Number(stuff[0] || 0),
      major,
      minor,
      patch,
    };
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = "show databases";

    const { rows } = await this.driverExecuteSingle(sql);

    return rows
      .filter((item) => filterDatabase(item, filter, "Database"))
      .map((row) => row.Database);
  }

  async listTables(
    _filter?: FilterOptions
  ): Promise<TableOrView[]> {
    const sql = `
      SELECT table_name as name
      FROM information_schema.tables
      WHERE table_schema = database()
      AND table_type NOT LIKE '%VIEW%'
      ORDER BY table_name
    `;
    const { rows } = await this.driverExecuteSingle(sql);
    return rows;
  }

  async listTableIndexes(
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const sql = `SHOW INDEX FROM ${this.wrapIdentifier(table)}`;

    const { rows } = await this.driverExecuteSingle(sql);

    const grouped = _.groupBy(rows, "Key_name");

    return Object.keys(grouped).map((key, idx) => {
      const row = grouped[key][0];

      const columns: IndexColumn[] = grouped[key].map((r) => ({
        name: r.Column_name,
        order: r.Collation === "A" ? "ASC" : "DESC",
        prefix: r.Sub_part, // Also called index prefix length.
      }));

      return {
        id: idx.toString(),
        table,
        schema: "",
        name: row.Key_name as string,
        columns,
        unique: row.Non_unique === "0" || row.Non_unique === 0,
        primary: row.Key_name === "PRIMARY",
      };
    });
  }

  async listTableColumns(
    table?: string,
    _schema?: string,
    connection?: Connection
  ): Promise<ExtendedTableColumn[]> {
    const hasGeneratedSupport = this.connectionType == 'mariadb' ?
     !isVersionLessThanOrEqual(this.versionInfo, { major: 10, minor: 2, patch: 4 }):
     !isVersionLessThanOrEqual(this.versionInfo, { major: 5, minor: 7, patch: 5 });
    const clause = table ? `AND table_name = ?` : "";
    const sql = `
      SELECT
        table_name AS 'table_name',
        column_name AS 'column_name',
        column_type AS 'column_type',
        data_type AS 'data_type',
        is_nullable AS 'is_nullable',
        column_default as 'column_default',
        ordinal_position as 'ordinal_position',
        COLUMN_COMMENT as 'column_comment',
        CHARACTER_SET_NAME as 'character_set',
        COLLATION_NAME as 'collation',
        ${hasGeneratedSupport ? "GENERATION_EXPRESSION as 'generation_expression'," : ''}
        extra as 'extra'
      FROM information_schema.columns
      WHERE table_schema = database()
      ${clause}
      ORDER BY ordinal_position
    `;

    const params = table ? [table] : [];

    const { rows } = await this.driverExecuteSingle(sql, {
      params,
      connection,
    });

    return rows.map((row) => ({
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.column_type,
      ordinalPosition: Number(row.ordinal_position),
      nullable: row.is_nullable === "YES",
      defaultValue: this.resolveDefault(row.column_default),
      extra: _.isEmpty(row.extra) ? null : row.extra,
      hasDefault: this.hasDefaultValue(this.resolveDefault(row.column_default), _.isEmpty(row.extra) ? null : row.extra),
      comment: _.isEmpty(row.column_comment) ? null : row.column_comment,
      generated: /^(STORED|VIRTUAL) GENERATED$/.test(row.extra || ""),
      generationExpression: row.generation_expression,
      characterSet: row.character_set,
      collation: row.collation,
      bksField: this.parseTableColumn(row),
    }));
  }

  async listTableTriggers(
    table: string,
    _schema?: string
  ): Promise<TableTrigger[]> {
    const sql = `
      SELECT
        trigger_name as name,
        event_object_schema as table_schema,
        event_object_table as table_name,
        event_manipulation as trigger_manipulation,
        action_statement as trigger_action,
        action_timing as trigger_timing,
        action_condition as trigger_condition
      FROM information_schema.triggers
      WHERE event_object_schema = database()
      AND event_object_table = ?
    `;

    const params = [table];

    const { rows } = await this.driverExecuteSingle(sql, { params });

    return rows.map((row) => ({
      name: row.name,
      timing: row.trigger_timing,
      manipulation: row.trigger_manipulation,
      action: row.trigger_action,
      condition: row.trigger_condition,
      table: row.table_name,
      schema: null,
    }));
  }

  async listRoutines(_filter?: FilterOptions): Promise<Routine[]> {
    const oldMysql = isVersionLessThanOrEqual(this.versionInfo, { major: 5, minor: 4, patch: Infinity })
    const routinesSQL = `
      select
        r.specific_name as specific_name,
        r.routine_name as routine_name,
        r.routine_type as routine_type,
        ${oldMysql ? 'NULL' : 'r.data_type' } as data_type,
        ${oldMysql ? 'NULL' : 'r.character_maximum_length' } as length
      from information_schema.routines r
      where r.routine_schema not in ('sys', 'information_schema',
                                 'mysql', 'performance_schema')
      and r.routine_schema = database()
      order by r.specific_name
    `;

    // this gives one row by parameter, so have to do a grouping
    const routinesResult = await this.driverExecuteSingle(routinesSQL);

    let grouped = {}
    if (!oldMysql) {
      const paramsSQL = `
        select
               r.routine_schema as routine_schema,
               r.specific_name as specific_name,
               p.parameter_name as parameter_name,
               p.character_maximum_length as char_length,
               p.data_type as data_type
        from information_schema.routines r
        left join information_schema.parameters p
                  on p.specific_schema = r.routine_schema
                  and p.specific_name = r.specific_name
        where r.routine_schema not in ('sys', 'information_schema',
                                       'mysql', 'performance_schema')
            AND p.parameter_mode is not null
            and r.routine_schema = database()
        order by r.routine_schema,
                 r.specific_name,
                 p.ordinal_position;
      `;

      const paramsResult = await this.driverExecuteSingle(paramsSQL);
      grouped = _.groupBy(paramsResult.rows, "specific_name");
    }

    return routinesResult.rows.map((r) => {
      const params = grouped[r.specific_name] || [];
      return {
        id: r.specific_name,
        name: r.specific_name,
        returnType: r.data_type,
        returnTypeLength: r.length || undefined,
        entityType: "routine",
        type: r.routine_type ? r.routine_type.toLowerCase() : "function",
        routineParams: params.map((p) => {
          return {
            name: p.parameter_name,
            type: p.data_type,
            length: p.char_length || undefined,
          };
        }),
      };
    });
  }

  async getPrimaryKeys(
    table: string,
    _schema?: string
  ): Promise<PrimaryKeyColumn[]> {
    logger().debug("finding primary keys for", this.db, table);
    const sql = `SHOW KEYS FROM ${this.wrapIdentifier(table)} WHERE Key_name = 'PRIMARY'`;
    const { rows } = await this.driverExecuteSingle(sql);

    if (!rows || rows.length === 0) return [];

    return rows.map((r) => ({
      columnName: r.Column_name,
      position: r.Seq_in_index,
    }));
  }

  async getPrimaryKey(
    table: string,
    _schema?: string
  ): Promise<string | null> {
    const res = await this.getPrimaryKeys(table);
    return res.length === 1 ? res[0].columnName : null;
  }

  async selectTop(
    table: string,
    offset: number,
    limit: number,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    _schema?: string,
    selects?: string[]
  ): Promise<TableResult> {
    const columns = await this.listTableColumns(table);
    const queries = buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects
    );
    const { query, params } = queries;
    const result = await this.driverExecuteSingle(query, { params });
    const fields = columns.map((v) => v.bksField).filter((v) => selects && selects.length > 0 ? selects.includes(v.name) : true);
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
    const columns = await this.listTableColumns(table);
    const { query, params } = buildSelectTopQuery(
      table,
      offset,
      limit,
      orderBy,
      filters,
      "total",
      columns,
      selects
    );
    return knex.raw(query, params).toQuery();
  }

  async selectTopStream(
    table: string,
    orderBy: OrderBy[],
    filters: string | TableFilter[],
    chunkSize: number,
    _schema?: string
  ): Promise<StreamResults> {
    const { countQuery, query, params } = buildSelectTopQuery(table, null, null, orderBy, filters);
    const columns = await this.listTableColumns(table);
    const rowCount = await this.driverExecuteSingle(countQuery, { params });

    return {
      totalRows: Number(rowCount.rows[0].total),
      columns,
      cursor: new MysqlCursor(this.conn, query, params, chunkSize),
    };
  }

  /**
   * Get quick and approximate record count. For slow and precise count, use
   * `SELECT COUNT(*)`.
   **/
  async getTableLength(table: string, _schema?: string): Promise<number> {
    const tableCheck =
      "SELECT TABLE_TYPE as tt FROM INFORMATION_SCHEMA.TABLES where table_schema = database() and TABLE_NAME = ?";
    const tcResult = await this.driverExecuteSingle(tableCheck, {
      params: [table],
    });
    const isTable = tcResult.rows[0] && tcResult.rows[0]["tt"] === "BASE TABLE";

    const queries = buildSelectTopQuery(table, 1, 1, [], []);
    let title = "total";
    if (isTable) {
      queries.countQuery = `show table status like '${MysqlData.wrapLiteral(table)}'`;
      title = "Rows";
    }
    const { countQuery, params } = queries;
    const countResults = await this.driverExecuteSingle(countQuery, {
      params,
    });
    const rowWithTotal = countResults.rows.find((row) => {
      return row[title];
    });
    const totalRecords = rowWithTotal ? rowWithTotal[title] : 0;
    return Number(totalRecords);
  }

  async getOutgoingKeys(
    table: string,
    _schema?: string
  ): Promise<TableKey[]> {
    // Query for foreign keys FROM this table (referencing other tables)
    const sql = `
    SELECT
      cu.constraint_name as 'constraint_name',
      cu.column_name as 'column_name',
      cu.referenced_table_name as 'referenced_table_name',
      IF(cu.referenced_table_name IS NOT NULL, 'FOREIGN', cu.constraint_name) as key_type,
      cu.REFERENCED_TABLE_NAME as referenced_table,
      cu.REFERENCED_COLUMN_NAME as referenced_column,
      rc.UPDATE_RULE as on_update,
      rc.DELETE_RULE as on_delete,
      rc.CONSTRAINT_NAME as rc_constraint_name,
      cu.ORDINAL_POSITION as ordinal_position
    FROM information_schema.key_column_usage cu
    JOIN information_schema.referential_constraints rc
      on cu.constraint_name = rc.constraint_name
      and cu.constraint_schema = rc.constraint_schema
    WHERE table_schema = database()
    AND cu.table_name = ?
    AND cu.referenced_table_name IS NOT NULL
    ORDER BY rc.CONSTRAINT_NAME, cu.ORDINAL_POSITION
  `;

    const params = [table];

    const { rows } = await this.driverExecuteSingle(sql, { params });

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(rows, 'constraint_name');

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key (backward compatibility)
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          constraintName: `${row.constraint_name}`,
          toTable: row.referenced_table,
          toColumn: row.referenced_column,
          fromTable: table,
          fromColumn: row.column_name,
          referencedTable: row.referenced_table_name,
          keyType: `${row.key_type} KEY`,
          onDelete: row.on_delete,
          onUpdate: row.on_update,
          toSchema: "",
          fromSchema: "",
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        constraintName: `${firstPart.constraint_name}`,
        toTable: firstPart.referenced_table,
        toColumn: keyParts.map(p => p.referenced_column),
        fromTable: table,
        fromColumn: keyParts.map(p => p.column_name),
        referencedTable: firstPart.referenced_table_name,
        keyType: `${firstPart.key_type} KEY`,
        onDelete: firstPart.on_delete,
        onUpdate: firstPart.on_update,
        toSchema: "",
        fromSchema: "",
        isComposite: true
      };
    });
  }

  async getIncomingKeys(
    table: string,
    _schema?: string
  ): Promise<TableKey[]> {
    // Query for foreign keys TO this table (other tables referencing this table)
    const incomingSQL = `
    SELECT
      cu.constraint_name as 'constraint_name',
      cu.table_name as 'from_table',
      cu.column_name as 'column_name',
      cu.referenced_table_name as 'referenced_table',
      cu.REFERENCED_COLUMN_NAME as 'referenced_column',
      rc.UPDATE_RULE as on_update,
      rc.DELETE_RULE as on_delete,
      cu.ORDINAL_POSITION as ordinal_position
    FROM information_schema.key_column_usage cu
    JOIN information_schema.referential_constraints rc
      on cu.constraint_name = rc.constraint_name
      and cu.constraint_schema = rc.constraint_schema
    WHERE table_schema = database()
    AND cu.referenced_table_name = ?
    ORDER BY cu.constraint_name, cu.ORDINAL_POSITION
  `;

    const params = [table];
    const { rows } = await this.driverExecuteSingle(incomingSQL, { params });

    // Group by constraint name to identify composite keys
    const groupedKeys = _.groupBy(rows, 'constraint_name');

    return Object.keys(groupedKeys).map(constraintName => {
      const keyParts = groupedKeys[constraintName];

      // If there's only one part, return a simple key
      if (keyParts.length === 1) {
        const row = keyParts[0];
        return {
          constraintName: `${row.constraint_name}`,
          toTable: row.referenced_table,
          toColumn: row.referenced_column,
          fromTable: row.from_table,
          fromColumn: row.column_name,
          onDelete: row.on_delete,
          onUpdate: row.on_update,
          toSchema: "",
          fromSchema: "",
          isComposite: false,
        };
      }

      // If there are multiple parts, it's a composite key
      const firstPart = keyParts[0];
      return {
        constraintName: `${firstPart.constraint_name}`,
        toTable: firstPart.referenced_table,
        toColumn: keyParts.map(p => p.referenced_column),
        fromTable: firstPart.from_table,
        fromColumn: keyParts.map(p => p.column_name),
        onDelete: firstPart.on_delete,
        onUpdate: firstPart.on_update,
        toSchema: "",
        fromSchema: "",
        isComposite: true,
      };
    });
  }

  async getTableProperties(
    table: string,
    _schema?: string
  ): Promise<TableProperties> {
    const propsSql = `
      SELECT
        table_comment as description,
        data_length as data_size,
        index_length as index_size
      FROM INFORMATION_SCHEMA.tables
      where table_schema = database()
      and table_name = ?
    `;

    const { rows } = await this.driverExecuteSingle(propsSql, {
      params: [table],
    });

    // eslint-disable-next-line
    // @ts-ignore
    const { description, data_size, index_size } =
      rows.length > 0 ? rows[0] : {};

    // const length = await this.getTableLength(table, []);
    const relations = await this.getTableKeys(table);
    const triggers = await this.listTableTriggers(table);
    const indexes = await this.listTableIndexes(table);

    return {
      description: description || undefined,
      indexSize: Number(index_size),
      size: Number(data_size),
      // length,
      indexes,
      relations,
      triggers,
      partitions: []
    };
  }

  async createDatabase(
    databaseName: string,
    charset: string,
    collation: string
  ): Promise<string> {
    const sql = `
      create database ${this.wrapIdentifier(databaseName)}
        character set ${this.wrapIdentifier(charset)}
        collate ${this.wrapIdentifier(collation)}
    `;

    await this.driverExecuteSingle(sql);
    return databaseName;
  }

  async executeApplyChanges(changes: TableChanges): Promise<any[]> {
    let results = [];

    await this.runWithConnection(async (connection) => {
      await this.driverExecuteSingle("START TRANSACTION", { connection });

      try {
        if (changes.inserts) {
          await this.insertRows(changes.inserts, connection);
        }

        if (changes.updates) {
          results = await this.updateValues(changes.updates, connection);
        }

        if (changes.deletes) {
          await this.deleteRows(changes.deletes, connection);
        }

        await this.driverExecuteSingle("COMMIT", { connection });
      } catch (ex) {
        logger().error("query exception: ", ex);
        await this.driverExecuteSingle("ROLLBACK", { connection });
        throw ex;
      }
    });

    return results;
  }

  async insertRows(inserts: TableInsert[], connection: mysql.PoolConnection) {
    for (const insert of inserts) {
      const columns = await this.listTableColumns(
        insert.table,
        undefined,
        connection
      );
      const command = buildInsertQuery(this.knex, insert, { columns });
      await this.driverExecuteSingle(command, { connection });
    }
    return true;
  }

  async updateValues(updates: TableUpdate[], connection: mysql.PoolConnection) {
    const commands = updates.map((update) => {
      let value = update.value;
      if (update.columnType && update.columnType === "bit(1)") {
        value = _.toNumber(update.value);
      } else if (update.columnType && update.columnType.startsWith("bit(")) {
        // value looks like this: b'00000001'
        value = parseInt(update.value.split("'")[1], 2);
      }

      const params = [value];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${this.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");

      return {
        query: `
          UPDATE ${this.wrapIdentifier(update.table)}
            SET ${this.wrapIdentifier(update.column)} = ?
            WHERE ${where}
        `,
        params: params,
      };
    });

    const results = [];
    // TODO: this should probably return the updated values
    for (let index = 0; index < commands.length; index++) {
      const blob = commands[index];
      await this.driverExecuteSingle(blob.query, {
        params: blob.params,
        connection,
      });
    }

    const returnQueries = updates.map((update) => {
      const params = [];
      const whereList = [];
      update.primaryKeys.forEach(({ column, value }) => {
        whereList.push(`${this.wrapIdentifier(column)} = ?`);
        params.push(value);
      });

      const where = whereList.join(" AND ");

      return {
        query: `
          select * from ${this.wrapIdentifier(update.table)} where ${where}
        `,
        params,
      };
    });

    for (let index = 0; index < returnQueries.length; index++) {
      const blob = returnQueries[index];
      const r = await this.driverExecuteSingle(blob.query, {
        params: blob.params,
        connection,
      });
      if (r.rows[0]) results.push(r.rows[0]);
    }

    return results;
  }

  async deleteRows(deletes: TableDelete[], connection: mysql.PoolConnection) {
    for (const command of buildDeleteQueries(this.knex, deletes)) {
      await this.driverExecuteSingle(command, { connection });
    }
    return true;
  }

  async truncateElementSql(elementName: string, typeOfElement: DatabaseElement) {
    return `TRUNCATE ${MysqlData.wrapLiteral(typeOfElement)} ${this.wrapIdentifier(elementName)}`;
  }

  async truncateElement(elementName: string, typeOfElement: DatabaseElement): Promise<void> {
    await this.runWithConnection(async (connection) => {
      await this.driverExecuteSingle(await this.truncateElementSql(elementName, typeOfElement), { connection });
    });
  }

  async setElementNameSql(
    elementName: string,
    newElementName: string,
    typeOfElement: DatabaseElement
  ): Promise<string> {
    elementName = this.wrapIdentifier(elementName);
    newElementName = this.wrapIdentifier(newElementName);

    let sql = ''

    if (typeOfElement === DatabaseElement.TABLE || typeOfElement === DatabaseElement.VIEW) {
      sql = `RENAME TABLE ${elementName} TO ${newElementName};`;
    }

    return sql
  }

  async dropElement(
    elementName: string,
    typeOfElement: DatabaseElement,
    _schema?: string
  ): Promise<void> {
    await this.runWithConnection(async (connection) => {
      const sql = `
        DROP ${MysqlData.wrapLiteral(typeOfElement)}
          ${this.wrapIdentifier(elementName)}
      `;
      await this.driverExecuteSingle(sql, { connection });
    });
  }

  async duplicateTable(
    tableName: string,
    duplicateTableName: string,
    _schema?: string
  ): Promise<void> {
    const sql = await this.duplicateTableSql(tableName, duplicateTableName);
    await this.driverExecuteSingle(sql);
  }

  async duplicateTableSql(
    tableName: string,
    duplicateTableName: string,
    _schema?: string
  ): Promise<string> {
    let sql = `
      CREATE TABLE ${this.wrapIdentifier(duplicateTableName)}
        LIKE ${this.wrapIdentifier(tableName)};
    `;
    sql += `
      INSERT INTO ${this.wrapIdentifier(duplicateTableName)}
        SELECT * FROM ${this.wrapIdentifier(tableName)};
    `;
    return sql;
  }

  async query(queryText: string, tabId: number): Promise<CancelableQuery> {
    let pid = null;
    let canceling = false;
    const cancelable = createCancelablePromise({
      ...errors.CANCELED_BY_USER,
      // eslint-disable-next-line
      // @ts-ignore
      sqlectronError: "CANCELED_BY_USER",
    });

    return {
      execute: () => {
        return this.runWithConnection(async (connection) => {
          const { rows: dataPid } = await this.driverExecuteSingle(
            "SELECT connection_id() AS pid",
            { connection }
          );

          pid = dataPid[0].pid;

          try {
            const data: QueryResult = await Promise.race([
              cancelable.wait(),
              this.executeQuery(queryText, { rowsAsArray: true, connection }),
            ]);

            pid = null;
            return data;
          } catch (err) {
            if (canceling && err.code === mysqlErrors.CONNECTION_LOST) {
              canceling = false;
              err.sqlectronError = "CANCELED_BY_USER";
              throw err;
            } else if (
              queryText &&
              _.trim(queryText).toUpperCase().startsWith("DELIMITER")
            ) {
              const nuError = new ClientError(
                `DELIMITER is only supported in the command line client, ${err.message}`,
                "https://docs.beekeeperstudio.io/support/troubleshooting/#mysql"
              );
              throw nuError;
            } else {
              throw err;
            }
          } finally {
            cancelable.discard();
          }
        }, tabId);
      },

      cancel: async () => {
        if (!pid) {
          throw new Error("Query not ready to be canceled");
        }

        canceling = true;
        try {
          await this.driverExecuteSingle(`kill ${pid};`);
          cancelable.cancel();
        } catch (err) {
          canceling = false;
          throw err;
        }
      },
    };
  }

  async executeQuery(
    queryText: string,
    options: { rowsAsArray?: boolean; connection?: mysql.PoolConnection } = {}
  ): Promise<NgQueryResult[]> {
    const { columns: fields, rows } = await this.driverExecuteSingle(queryText, {
      params: {},
      rowsAsArray: options.rowsAsArray,
      connection: options.connection,
    });

    if (!rows) {
      return [];
    }

    const commands = identifyCommands(queryText).map((item) => item.type);

    if (!isMultipleQuery(fields)) {
      return [
        parseRowQueryResult(rows, fields, commands[0], options.rowsAsArray),
      ];
    }

    return rows.map((_, idx) =>
      parseRowQueryResult(
        rows[idx],
        fields[idx],
        commands[idx],
        options.rowsAsArray
      )
    );
  }

  async rawExecuteQuery(
    query: string,
    options: {
      connection?: mysql.PoolConnection;
      rowsAsArray?: boolean;
      params?: any;
    }
  ): Promise<ResultType | ResultType[]> {
    const runQuery = (connection: mysql.PoolConnection) =>
      new Promise<ResultType>((resolve, reject) => {
        const params =
          !options.params || _.isEmpty(options.params)
            ? undefined
            : options.params;
        logger().info(`Running Query`, query, params);
        connection.query(
          {
            sql: query,
            values: params,
            rowsAsArray: options.rowsAsArray,
          },
          (err, data, fields) => {
            if (err && err.code === mysqlErrors.EMPTY_QUERY) {
              return resolve({ rows: [], columns: [], arrayMode: undefined });
            }

            if (err) {
              return reject(getRealError(connection, err));
            }

            logger().info(`Running Query Finished`);
            resolve({ rows: data as any[], columns: fields, arrayMode: options.rowsAsArray });
          }
        );
      });

    return options.connection
      ? runQuery(options.connection)
      : this.runWithConnection(runQuery);
  }

  async runWithConnection<T>(run: (connection: mysql.PoolConnection) => Promise<T>, tabId?: number): Promise<T> {
    const { pool } = this.conn;
    const hasReserved = this.reservedConnections.has(tabId);
    let conn: mysql.PoolConnection;
    if (hasReserved) {
      conn = this.reservedConnections.get(tabId);
    } else {
      conn = await new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
          if (err) {
            reject(err);
          }
          resolve(connection);
        })
      });
    }

    conn.on("error", (error) => {
      logger().error("Connection fatal error %j", error);
    });

    try {
      return await run(conn);
    } finally {
      if (!hasReserved) {
        conn.release();
      }
    }
  }

  async runWithTransaction<T>(func: (c: mysql.PoolConnection) => Promise<T>): Promise<T> {
    return await this.runWithConnection(async (connection) => {
      try {
        await this.driverExecuteSingle("START TRANSACTION");
        const result = await func(connection);
        await this.driverExecuteSingle("COMMIT");
        return result;
      } catch (ex) {
        await this.driverExecuteSingle("ROLLBACK");
        log.error(ex)
        throw ex;
      }
    });
  }

  async alterTableSql(change: AlterTableSpec): Promise<string> {
    const columns = await this.listTableColumns(change.table);
    const builder = new MySqlChangeBuilder(change.table, columns);
    return builder.alterTable(change);
  }

  async alterTable(change: AlterTableSpec): Promise<void> {
    await this.runWithTransaction(async (connection) => {
      const sql = await this.alterTableSql(change);
      return await this.driverExecuteSingle(sql, { connection });
    });
  }

  getBuilder(table: string, _schema?: string): ChangeBuilderBase {
    return new MySqlChangeBuilder(table, []);
  }

  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: true,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: true,
      backDirFormat: false,
      restore: true,
      indexNullsNotDistinct: false,
      transactions: true,
      filterTypes: ['standard']
    };
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT table_name as name
      FROM information_schema.views
      WHERE table_schema = database()
      ORDER BY table_name
    `;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows;
  }

  async listMaterializedViewColumns(
    _table: string,
    _schema?: string
  ): Promise<TableColumn[]> {
    return [];
  }

  async listSchemas(
    _filter?: SchemaFilterOptions
  ): Promise<string[]> {
    return [];
  }

  async getTableReferences(table: string, _schema?: string): Promise<string[]> {
    const sql = `
      SELECT referenced_table_name as 'referenced_table_name'
      FROM information_schema.key_column_usage
      WHERE referenced_table_name IS NOT NULL
      AND table_schema = database()
      AND table_name = ?
    `;

    const params = [table];

    const { rows } = await this.driverExecuteSingle(sql, { params });

    return rows.map((row) => row.referenced_table_name);
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const sql = `SHOW CREATE TABLE ${this.wrapIdentifier(table)}`;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => row["Create Table"])[0];
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const sql = `SHOW CREATE VIEW ${this.wrapIdentifier(view)}`;

    const { rows } = await this.driverExecuteSingle(sql);

    return rows.map((row) => row["Create View"]);
  }

  async getRoutineCreateScript(
    routine: string,
    type: string,
    _schema?: string
  ): Promise<string[]> {
    const sql = `SHOW CREATE ${type.toUpperCase()} ${this.wrapIdentifier(routine)}`;
    const { rows } = await this.driverExecuteSingle(sql);
    const result = rows.map((row) => {
      const upperCaseIndexedRow = Object.keys(row).reduce(
        (prev, current) => ({ ...prev, [current.toUpperCase()]: row[current] }),
        {}
      );
      return upperCaseIndexedRow[`CREATE ${type.toUpperCase()}`];
    });
    return result;
  }

  async truncateAllTables(_db: string, _schema?: string): Promise<void> {
    await this.runWithConnection(async (connection) => {
      const schema = await this.getSchema(connection);

      const sql = `
        SELECT table_name as 'table_name'
        FROM information_schema.tables
        WHERE table_schema = '${schema}'
        AND table_type NOT LIKE '%VIEW%'
      `;

      const { rows } = await this.driverExecuteSingle(sql, { connection });

      const truncateAll = rows
        .map(
          (row) => `
            SET FOREIGN_KEY_CHECKS = 0;
            TRUNCATE TABLE
              ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(
            row.table_name
          )};
            SET FOREIGN_KEY_CHECKS = 1;
          `
        )
        .join("");

      await this.driverExecuteSingle(truncateAll, { connection });
    });
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async queryStream(
    query: string,
    chunkSize: number
  ): Promise<StreamResults> {
    const theCursor = new MysqlCursor(this.conn, query, [], chunkSize);
    log.debug("results", theCursor);

    const { columns, totalRows } = await this.getColumnsAndTotalRows(query)

    return {
      totalRows,
      columns,
      cursor: theCursor,
    };
  }

  wrapIdentifier(value: string): string {
    return value !== "*" ? `\`${value.replaceAll(/`/g, "``")}\`` : "*";
  }

  async setTableDescription(
    table: string,
    description: string,
    _schema?: string
  ): Promise<string> {
    const query = `
      ALTER TABLE ${this.wrapIdentifier(table)}
        COMMENT = '${escapeString(description)}'
    `;
    await this.driverExecuteSingle(query);
    const result = await this.getTableProperties(table);
    return result.description;
  }

  async listCharsets(): Promise<string[]> {
    const sql = "show character set";
    const { rows } = await this.driverExecuteSingle(sql);
    return rows.map((row) => row.Charset).sort();
  }

  async getDefaultCharset(): Promise<string> {
    const sql = "SHOW VARIABLES LIKE 'character_set_server'";
    const { rows } = await this.driverExecuteSingle(sql);
    return rows[0].Value;
  }

  async listCollations(charset: string): Promise<string[]> {
    const sql = "show collation where charset = ?";
    const params = [charset];
    const { rows } = await this.driverExecuteSingle(sql, { params });
    return rows.map((row) => row.Collation).sort();
  }

  async createDatabaseSQL(): Promise<string> {
    const sql = `
      create database "mydatabase"
        character set "utf8mb4"
        collate "utf8mb4_general_ci"
    `;
    return sql;
  }

  async getSchema(connection?: mysql.PoolConnection) {
    const sql = "SELECT database() AS 'schema'";
    const { rows } = await this.driverExecuteSingle(sql, { connection });
    return rows[0].schema;
  }

  hasDefaultValue(defaultValue: string|null, extraValue: string|null): boolean {
    return !_.isNil(defaultValue) || !_.isNil(extraValue) && ['auto_increment', 'default_generated'].includes(extraValue.toLowerCase())
  }

  resolveDefault(defaultValue: string) {
    return defaultValue;
  }

  async importBeginCommand(_table: TableOrView, { executeOptions }: ImportFuncOptions): Promise<any> {
    return this.rawExecuteQuery('START TRANSACTION;', executeOptions)
  }

  async importTruncateCommand (table: TableOrView, { executeOptions }: ImportFuncOptions): Promise<any> {
    const { name } = table
    return this.rawExecuteQuery(`TRUNCATE TABLE ${this.wrapIdentifier(name)};`, executeOptions)
  }

  async importLineReadCommand (_table: TableOrView, sqlString: string, { executeOptions }: ImportFuncOptions): Promise<any> {
    return this.rawExecuteQuery(sqlString, executeOptions)
  }

  async importCommitCommand (_table: TableOrView, { executeOptions }: ImportFuncOptions): Promise<any> {
    return this.rawExecuteQuery('COMMIT;', executeOptions)
  }

  async importRollbackCommand (_table: TableOrView, { executeOptions }: ImportFuncOptions): Promise<any> {
    return this.rawExecuteQuery('ROLLBACK;', executeOptions)
  }

  async reserveConnection(tabId: number): Promise<void> {
    this.throwIfHasConnection(tabId);

    if (this.reservedConnections.size >= BksConfig.db[this.connectionType].maxReservedConnections) {
      throw new Error(errorMessages.maxReservedConnections)
    }

    return new Promise((resolve, reject) => {
      this.conn.pool.getConnection((err, conn) => {
        if (!err) {
          try {
            this.pushConnection(tabId, conn);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
        reject(err);
      })
    })
  }

  async releaseConnection(tabId: number): Promise<void> {
    const conn = this.popConnection(tabId);
    if (conn) {
      conn.release();
    }
  }

  async startTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('START TRANSACTION', { connection: conn });
  }

  async commitTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('COMMIT', { connection: conn });
  }

  async rollbackTransaction(tabId: number): Promise<void> {
    const conn = this.peekConnection(tabId);
    await this.driverExecuteSingle('ROLLBACK', { connection: conn });
  }

  async getServerStatistics(): Promise<ServerStatistics> {
    return this.runWithConnection(async (connection) => {
      const { rows: statusRows } = await this.driverExecuteSingle(
        "SHOW GLOBAL STATUS",
        { connection }
      );
      const { rows: variableRows } = await this.driverExecuteSingle(
        "SHOW GLOBAL VARIABLES",
        { connection }
      );

      const statusMap: Record<string, string> = {};
      for (const row of statusRows) {
        statusMap[row.Variable_name] = row.Value;
      }

      const variableMap: Record<string, string> = {};
      for (const row of variableRows) {
        variableMap[row.Variable_name] = row.Value;
      }

      const uptime = parseInt(statusMap["Uptime"] || "1", 10);
      const questions = parseInt(statusMap["Questions"] || "0", 10);

      return {
        queryCache: {
          size: variableMap["query_cache_size"] || "0",
          limit: variableMap["query_cache_limit"] || "0",
          hits: parseInt(statusMap["Qcache_hits"] || "0", 10),
          inserts: parseInt(statusMap["Qcache_inserts"] || "0", 10),
          lowMemoryPrunes: parseInt(statusMap["Qcache_lowmem_prunes"] || "0", 10),
        },
        performance: {
          connections: parseInt(statusMap["Connections"] || "0", 10),
          uptime,
          threadsRunning: parseInt(statusMap["Threads_running"] || "0", 10),
          threadsConnected: parseInt(statusMap["Threads_connected"] || "0", 10),
          slowQueries: parseInt(statusMap["Slow_queries"] || "0", 10),
          questionsPerSecond: uptime > 0 ? Math.round((questions / uptime) * 100) / 100 : 0,
        },
        memory: {
          keyBufferSize: variableMap["key_buffer_size"] || "0",
          innodbBufferPoolSize: variableMap["innodb_buffer_pool_size"] || "0",
          innodbBufferPoolUsed: statusMap["Innodb_buffer_pool_bytes_data"] || "0",
        },
      };
    });
  }

  protected parseQueryResultColumns(qr: ResultType): BksField[] {
    return qr.columns.map((column) => {
      let bksType: BksFieldType = 'UNKNOWN';
      if (binaryTypes.includes(column.type) && ((column.flags as number) & FieldFlags.BINARY)) {
        bksType = 'BINARY';
      }
      return { name: column.name, bksType }
    })
  }

  parseTableColumn(column: { column_name: string; data_type: string }): BksField {
    return {
      name: column.column_name,
      bksType: binaryDataTypes.includes(column.data_type) ? 'BINARY' : 'UNKNOWN',
    };
  }
}

export const testOnly = {
  parseFields,
};
