// Copyright (c) 2015 The SQLECTRON Team

import {
  AppContextProvider,
  BasicDatabaseClient,
  ExecutionContext,
  QueryLogOptions,
} from "./BasicDatabaseClient";
import mysql, { Connection } from "mysql2";
import rawLog from "electron-log";
import knexlib from "knex";
import { readFileSync } from "fs";
import _ from "lodash";
import {
  applyChangesSql,
  buildDeleteQueries,
  buildInsertQuery,
  buildSelectTopQuery,
  escapeString,
  ClientError
} from "./utils";
import {
  IDbConnectionDatabase,
  DatabaseElement,
} from "../types";
import { MysqlCursor } from "./mysql/MySqlCursor";
import { createCancelablePromise } from "@/common/utils";
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
  StreamResults,
  SupportedFeatures,
  TableChanges,
  TableColumn,
  TableDelete,
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
import { uuidv4 } from "@/lib/uuid";
import { IDbConnectionServer } from "../backendTypes";

type ResultType = {
  data: any[];
  fields: any[];
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

function configDatabase(
  server: IDbConnectionServer,
  database: IDbConnectionDatabase
): mysql.PoolOptions {
  const config: mysql.PoolOptions = {
    host: server.config.host,
    port: server.config.port,
    user: server.config.user,
    password: server.config.password,
    database: database.database,
    multipleStatements: true,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
    connectTimeout: 60 * 60 * 1000,
  };

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

export class MysqlClient extends BasicDatabaseClient<ResultType> {
  connectionBaseType = 'mysql' as const;

  versionInfo: {
    versionString: string;
    version: number;
  };
  conn: {
    pool: mysql.Pool;
  };

  clientId: string

  constructor(server: IDbConnectionServer, database: IDbConnectionDatabase) {
    super(knex, context, server, database);
    this.clientId = uuidv4();

    this.dialect = 'mysql';
    this.readOnlyMode = server?.config?.readOnlyMode || false;
  }

  async connect() {
    await super.connect();

    const dbConfig = configDatabase(this.server, this.database);
    logger().debug("create driver client for mysql with config %j", dbConfig);

    this.conn = {
      pool: mysql.createPool(dbConfig),
    };

    this.conn.pool.on('acquire', (connection) => {
      log.debug('Pool connection %d acquired on %s', connection.threadId, this.clientId);
    });

    this.conn.pool.on('release', (connection) => {
      log.debug('Pool connection %d released on %s', connection.threadId, this.clientId);
    });


    this.versionInfo = await this.getVersion();
  }

  async disconnect() {
    this.conn?.pool.end();

    await super.disconnect();
  }

  async versionString() {
    return this.versionInfo?.versionString;
  }

  async getVersion() {
    const { data } = await this.driverExecuteSingle("SELECT VERSION() as v");
    const version = data[0]["v"];
    if (!version) {
      return {
        versionString: "",
        version: 5.7,
      };
    }

    const stuff = version.split("-");

    return {
      versionString: version,
      version: Number(stuff[0] || 0),
    };
  }

  async listDatabases(filter?: DatabaseFilterOptions): Promise<string[]> {
    const sql = "show databases";

    const { data } = await this.driverExecuteSingle(sql);

    return data
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
    const { data } = await this.driverExecuteSingle(sql);
    return data;
  }

  async listTableIndexes(
    table: string,
    _schema?: string
  ): Promise<TableIndex[]> {
    const sql = `SHOW INDEX FROM ${this.wrapIdentifier(table)}`;

    const { data } = await this.driverExecuteSingle(sql);

    const grouped = _.groupBy(data, "Key_name");

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
        unique: row.Non_unique === "0",
        primary: row.Key_name === "PRIMARY",
      };
    });
  }

  async listTableColumns(
    table?: string,
    _schema?: string,
    connection?: Connection
  ): Promise<ExtendedTableColumn[]> {
    const clause = table ? `AND table_name = ?` : "";
    const sql = `
      SELECT
        table_name AS 'table_name',
        column_name AS 'column_name',
        column_type AS 'data_type',
        is_nullable AS 'is_nullable',
        column_default as 'column_default',
        ordinal_position as 'ordinal_position',
        COLUMN_COMMENT as 'column_comment',
        extra as 'extra'
      FROM information_schema.columns
      WHERE table_schema = database()
      ${clause}
      ORDER BY ordinal_position
    `;

    const params = table ? [table] : [];

    const { data } = await this.driverExecuteSingle(sql, {
      params,
      connection,
    });

    return data.map((row) => ({
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      ordinalPosition: Number(row.ordinal_position),
      nullable: row.is_nullable === "YES",
      defaultValue: this.resolveDefault(row.column_default),
      extra: _.isEmpty(row.extra) ? null : row.extra,
      hasDefault: this.hasDefaultValue(this.resolveDefault(row.column_default), _.isEmpty(row.extra) ? null : row.extra),
      comment: _.isEmpty(row.column_comment) ? null : row.column_comment,
      generated: /^(STORED|VIRTUAL) GENERATED$/.test(row.extra || ""),
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

    const { data } = await this.driverExecuteSingle(sql, { params });

    return data.map((row) => ({
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
    const routinesSQL = `
      select
        r.specific_name as specific_name,
        r.routine_name as routine_name,
        r.routine_type as routine_type,
        r.data_type as data_type,
        r.character_maximum_length as length
      from information_schema.routines r
      where r.routine_schema not in ('sys', 'information_schema',
                                 'mysql', 'performance_schema')
      and r.routine_schema = database()
      order by r.specific_name
    `;

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

    // this gives one row by parameter, so have to do a grouping
    const routinesResult = await this.driverExecuteSingle(routinesSQL);
    const paramsResult = await this.driverExecuteSingle(paramsSQL);

    const grouped = _.groupBy(paramsResult.data, "specific_name");

    return routinesResult.data.map((r) => {
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
    const { data } = await this.driverExecuteSingle(sql);

    if (!data || data.length === 0) return [];

    return data.map((r) => ({
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
    const qs = buildSelectTopQuery(table, null, null, orderBy, filters);
    const columns = await this.listTableColumns(table);
    const rowCount = await this.driverExecuteSingle(qs.countQuery);
    // TODO: DEBUG HERE
    const { query, params } = qs;

    return {
      totalRows: Number(rowCount.data[0].total),
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
    const isTable = tcResult.data[0] && tcResult.data[0]["tt"] === "BASE TABLE";

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
    const rowWithTotal = countResults.data.find((row) => {
      return row[title];
    });
    const totalRecords = rowWithTotal ? rowWithTotal[title] : 0;
    return Number(totalRecords);
  }

  async getTableKeys(
    table: string,
    _schema?: string
  ): Promise<TableKey[]> {
    const sql = `
    SELECT
      cu.constraint_name as 'constraint_name',
      cu.column_name as 'column_name',
      cu.referenced_table_name as 'referenced_table_name',
      IF(cu.referenced_table_name IS NOT NULL, 'FOREIGN', cu.constraint_name) as key_type,
      cu.REFERENCED_TABLE_NAME as referenced_table,
      cu.REFERENCED_COLUMN_NAME as referenced_column,
      rc.UPDATE_RULE as on_update,
      rc.DELETE_RULE as on_delete
    FROM information_schema.key_column_usage cu
    JOIN information_schema.referential_constraints rc
      on cu.constraint_name = rc.constraint_name
      and cu.constraint_schema = rc.constraint_schema
    WHERE table_schema = database()
    AND cu.table_name = ?
    AND cu.referenced_table_name IS NOT NULL
  `;

    const params = [table];

    const { data } = await this.driverExecuteSingle(sql, { params });

    return data.map((row) => ({
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
    }));
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

    const { data } = await this.driverExecuteSingle(propsSql, {
      params: [table],
    });

    // eslint-disable-next-line
    // @ts-ignore
    const { description, data_size, index_size } =
      data.length > 0 ? data[0] : {};

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
  ): Promise<void> {
    const sql = `
      create database ${this.wrapIdentifier(databaseName)}
        character set ${this.wrapIdentifier(charset)}
        collate ${this.wrapIdentifier(collation)}
    `;

    await this.driverExecuteSingle(sql);
  }

  async applyChanges(changes: TableChanges): Promise<any[]> {
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

  async applyChangesSql(changes: TableChanges): Promise<string> {
    return applyChangesSql(changes, knex);
  }

  async insertRows(inserts: TableInsert[], connection: mysql.PoolConnection) {
    for (const insert of inserts) {
      const columns = await this.listTableColumns(
        insert.table,
        undefined,
        connection
      );
      const command = buildInsertQuery(this.knex, insert, columns);
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
      if (r.data[0]) results.push(r.data[0]);
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

  async query(queryText: string): Promise<CancelableQuery> {
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
          const { data: dataPid } = await this.driverExecuteSingle(
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
                "https://docs.beekeeperstudio.io/pages/troubleshooting#mysql"
              );
              throw nuError;
            } else {
              throw err;
            }
          } finally {
            cancelable.discard();
          }
        });
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
    const { fields, data } = await this.driverExecuteSingle(queryText, {
      params: {},
      rowsAsArray: options.rowsAsArray,
      connection: options.connection,
    });

    if (!data) {
      return [];
    }

    const commands = identifyCommands(queryText).map((item) => item.type);

    if (!isMultipleQuery(fields)) {
      return [
        parseRowQueryResult(data, fields, commands[0], options.rowsAsArray),
      ];
    }

    return data.map((_, idx) =>
      parseRowQueryResult(
        data[idx],
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
      new Promise<{ data: any; fields: any[] }>((resolve, reject) => {
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
              return resolve({ data: [], fields: [] });
            }

            if (err) {
              return reject(getRealError(connection, err));
            }

            logger().info(`Running Query Finished`);
            resolve({ data, fields });
          }
        );
      });

    return options.connection
      ? runQuery(options.connection)
      : this.runWithConnection(runQuery);
  }

  async runWithConnection<T>(run: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const { pool } = this.conn;
    let rejected = false;
    return new Promise((resolve, reject) => {
      const rejectErr = (err) => {
        if (!rejected) {
          rejected = true;
          reject(err);
        }
      };

      pool.getConnection((errPool, connection) => {
        if (errPool) {
          rejectErr(errPool);
          return;
        }

        connection.on("error", (error) => {
          // it will be handled later in the next query execution
          logger().error("Connection fatal error %j", error);
        });
        run(connection)
          .then((res) => resolve(res))
          .catch((ex) => rejectErr(ex))
          .finally(() => connection.release())
      });
    });
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
    };
  }

  async listViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    const sql = `
      SELECT table_name as name
      FROM information_schema.views
      WHERE table_schema = database()
      ORDER BY table_name
    `;

    const { data } = await this.driverExecuteSingle(sql);

    return data;
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

    const { data } = await this.driverExecuteSingle(sql, { params });

    return data.map((row) => row.referenced_table_name);
  }

  async getQuerySelectTop(table: string, limit: number, _schema?: string): Promise<string> {
    return `SELECT * FROM ${this.wrapIdentifier(table)} LIMIT ${limit}`;
  }

  async getTableCreateScript(table: string, _schema?: string): Promise<string> {
    const sql = `SHOW CREATE TABLE ${this.wrapIdentifier(table)}`;

    const { data } = await this.driverExecuteSingle(sql);

    return data.map((row) => row["Create Table"])[0];
  }

  async getViewCreateScript(view: string, _schema?: string): Promise<string[]> {
    const sql = `SHOW CREATE VIEW ${this.wrapIdentifier(view)}`;

    const { data } = await this.driverExecuteSingle(sql);

    return data.map((row) => row["Create View"]);
  }

  async getRoutineCreateScript(
    routine: string,
    type: string,
    _schema?: string
  ): Promise<string[]> {
    const sql = `SHOW CREATE ${type.toUpperCase()} ${this.wrapIdentifier(routine)}`;
    const { data } = await this.driverExecuteSingle(sql);
    const result = data.map((row) => {
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

      const { data } = await this.driverExecuteSingle(sql, { connection });

      const truncateAll = data
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
    const { data } = await this.driverExecuteSingle(sql);
    return data.map((row) => row.Charset).sort();
  }

  async getDefaultCharset(): Promise<string> {
    const sql = "SHOW VARIABLES LIKE 'character_set_server'";
    const { data } = await this.driverExecuteSingle(sql);
    return data[0].Value;
  }

  async listCollations(charset: string): Promise<string[]> {
    const sql = "show collation where charset = ?";
    const params = [charset];
    const { data } = await this.driverExecuteSingle(sql, { params });
    return data.map((row) => row.Collation).sort();
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
    const { data } = await this.driverExecuteSingle(sql, { connection });
    return data[0].schema;
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
}

export const testOnly = {
  parseFields,
};
