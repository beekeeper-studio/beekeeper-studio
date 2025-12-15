import pg, { PoolConfig } from "pg";
import { FilterOptions, SupportedFeatures, TableIndex, TableOrView, TablePartition, TableProperties, TableTrigger, ExtendedTableColumn, BksField } from "../models";
import { PostgresClient, STQOptions } from "./postgresql";
import _ from 'lodash';
import { defaultCreateScript } from "./postgresql/scripts";
import BksConfig from '@/common/bksConfig';
import { IDbConnectionServer } from "../backendTypes";


export class CockroachClient extends PostgresClient {
  async supportedFeatures(): Promise<SupportedFeatures> {
    return {
      customRoutines: true,
      comments: true,
      properties: true,
      partitions: false,
      editPartitions: false,
      backups: false,
      backDirFormat: false,
      restore: false,
      indexNullsNotDistinct: false,
      transactions: true,
      filterTypes: ['standard', 'ilike']
    };
  }

  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
  }

  async listTableColumns(table?: string, schema: string = this._defaultSchema): Promise<ExtendedTableColumn[]> {
    // if you provide table, you have to provide schema
    const clause = table ? "WHERE table_schema = $1 AND table_name = $2" : "";
    const params = table ? [schema, table] : [];
    if (table && !schema) {
      throw new Error(`Table '${table}' provided for listTableColumns, but no schema name`);
    }

    const sql = `
      SELECT
        table_schema,
        table_name,
        column_name,
        is_nullable,
        ${this.version.number > 120_000 ? "is_generated," : ""}
        ordinal_position,
        column_default,
        CASE
          WHEN character_maximum_length is not null  and udt_name != 'text'
            THEN udt_name || '(' || character_maximum_length::varchar(255) || ')'
          WHEN numeric_precision is not null and numeric_scale is not null
            THEN udt_name || '(' || numeric_precision::varchar(255) || ',' || numeric_scale::varchar(255) || ')'
          WHEN numeric_precision is not null and numeric_scale is null
            THEN udt_name || '(' || numeric_precision::varchar(255) || ')'
          WHEN datetime_precision is not null AND udt_name != 'date' THEN
            udt_name || '(' || datetime_precision::varchar(255) || ')'
          ELSE udt_name
        END as data_type,
        CASE
          WHEN data_type = 'ARRAY' THEN 'YES'
          ELSE 'NO'
        END as is_array,
        column_comment
      FROM information_schema.columns
      ${clause}
      ORDER BY table_schema, table_name, ordinal_position
    `;

    const data = await this.driverExecuteSingle(sql, { params });

    return data.rows.map((row: any) => ({
      schemaName: row.table_schema,
      tableName: row.table_name,
      columnName: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
      ordinalPosition: Number(row.ordinal_position),
      hasDefault: !_.isNil(row.column_default),
      generated: row.is_generated === "ALWAYS" || row.is_generated === "YES",
      array: row.is_array === "YES",
      comment: row.column_comment || null,
      bksField: this.parseTableColumn(row),
    }));
  }

  async listTablePartitions(_table: string, _schema: string): Promise<TablePartition[]> {
    return null;
  }

  async listTableTriggers(_table: string, _schema?: string): Promise<TableTrigger[]> {
    // unsupported https://www.cockroachlabs.com/docs/stable/sql-feature-support.html
    return [];
  }

  async listTableIndexes(table: string, schema?: string): Promise<TableIndex[]> {
    const sql = `
     show indexes from ${this.tableName(table, schema)};
    `

    const result = await this.driverExecuteSingle(sql);
    const grouped = _.groupBy(result.rows, 'index_name')
    return Object.keys(grouped).map((indexName: string, idx) => {
      const columns = grouped[indexName].filter((c) => !c.implicit)
      const first: any = grouped[indexName][0]
      return {
        id: idx.toString(),
        name: indexName,
        table: table,
        schema: schema,
        // v21.2 onwards changes index names for primary keys
        primary: first.index_name === 'primary' || first.index_name.endsWith('pkey'),
        unique: !first.non_unique,
        columns: _.sortBy(columns, ['seq_in_index']).map((c: any) => ({
          name: c.column_name,
          order: c.direction
        }))

      }
    })
  }

  async getTableProperties(table: string, schema?: string): Promise<TableProperties> {
    const detailsPromise = Promise.resolve({ rows: [] });
    const triggersPromise = Promise.resolve([]);
    const partitionsPromise = Promise.resolve([]);

    const [
      result,
      indexes,
      relations,
      triggers,
      partitions,
      owner
    ] = await Promise.all([
      detailsPromise,
      this.listTableIndexes(table, schema),
      this.getTableKeys(table, schema),
      triggersPromise,
      partitionsPromise,
      this.getTableOwner(table, schema)
    ]);

    const props = result.rows.length > 0 ? result.rows[0] : {};
    return {
      description: props.description,
      indexSize: Number(props.index_size),
      size: Number(props.table_size),
      indexes,
      relations,
      triggers,
      partitions,
      owner
    };
  }

  async createDatabase(databaseName: string, charset: string, _collation: string): Promise<string> {
    const sql = `create database ${this.wrapIdentifier(databaseName)} encoding ${this.wrapIdentifier(charset)}`;

    await this.driverExecuteSingle(sql);
    return databaseName;
  }

  async getTableCreateScript(table: string, schema: string = this._defaultSchema): Promise<string> {
    const params = [
      table,
      schema,
    ];

    const data = await this.driverExecuteSingle(defaultCreateScript, { params });

    return data.rows.map((row) => row.createtable)[0];
  }

  protected countQuery(_options: STQOptions, baseSQL: string): string {
    return `SELECT count(*) as total ${baseSQL}`;
  }

  protected async configDatabase(server: IDbConnectionServer, database: { database: string }) {
    let optionsString = undefined;
    const cluster = server.config.options?.cluster || undefined;
    if (cluster) {
      optionsString = `--cluster=${cluster}`;
    }

    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: server.config.password || undefined,
      database: database.database,
      max: BksConfig.db.cockroachdb.maxConnections, // max idle connections per time (30 secs)
      connectionTimeoutMillis: BksConfig.db.cockroachdb.connectionTimeout,
      idleTimeoutMillis: BksConfig.db.cockroachdb.idleTimeout,
      // not in the typings, but works.
      // @ts-ignore
      options: optionsString
    };

    return this.configurePool(config, server, null);
  }

  protected async getTypes(): Promise<any> {
    const sql = `
      SELECT      n.nspname as schema, t.typname as typename, t.oid::integer as typeid
      FROM        pg_type t
      LEFT JOIN   pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE       (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
      AND     NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
      AND     n.nspname NOT IN ('pg_catalog', 'information_schema');
    `;

    const data = await this.driverExecuteSingle(sql);
    const result: any = {}
    data.rows.forEach((row: any) => {
      result[row.typeid] = row.typename
    })
    _.merge(result, _.invert(pg.types.builtins))
    result[1009] = 'array'
    return result
  }

  parseTableColumn(column: { column_name: string, data_type: string }): BksField {
    return {
      name: column.column_name,
      bksType: column.data_type === 'bytea' ? 'BINARY' : 'UNKNOWN',
    }
  }
}
