import { PoolConfig } from "pg";
import { AWSCredentials, ClusterCredentialConfiguration, RedshiftCredentialResolver } from "../authentication/amazon-redshift";
import { DatabaseElement } from "../types";
import { FilterOptions, PrimaryKeyColumn, SupportedFeatures, TableOrView, TableProperties, ExtendedTableColumn } from "../models";
import { PostgresClient, STQOptions } from "./postgresql";
import {escapeString, resolveAWSCredentials} from "./utils";
import pg from 'pg';
import BksConfig from "@/common/bksConfig";
import { TableKey } from "@shared/lib/dialects/models";
import { IDbConnectionServer } from "../backendTypes";
import _ from "lodash";

export class RedshiftClient extends PostgresClient {
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
    // Reference: https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_COLUMNS.html
    if (table && !schema) {
      throw new Error(`Table '${table}' provided for listTableColumns, but no schema name`);
    }

    const clause = table ? "WHERE table_schema = $1 AND table_name = $2" : "";
    const params = table ? [schema, table] : [];

    const sql = `
      SELECT
        table_schema,
        table_name,
        column_name,
        is_nullable,
        ordinal_position,
        column_default,
        CASE
          WHEN character_maximum_length IS NOT NULL AND data_type != 'text'
            THEN data_type || '(' || character_maximum_length::VARCHAR(255) || ')'
          WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
            THEN data_type || '(' || numeric_precision::VARCHAR(255) || ',' || numeric_scale::VARCHAR(255) || ')'
          WHEN numeric_precision IS NOT NULL AND numeric_scale IS NULL
            THEN data_type || '(' || numeric_precision::VARCHAR(255) || ')'
          WHEN datetime_precision IS NOT NULL AND data_type NOT IN ('date', 'time')
            THEN data_type || '(' || datetime_precision::VARCHAR(255) || ')'
          ELSE data_type
      END AS data_type,
        remarks AS column_comment
      FROM svv_columns
      ${clause}
      ORDER BY table_schema, table_name, ordinal_position;
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
      hasDefault: row.column_default !== null,
      generated: null, // Redshift does not support generated columns in svv_columns
      array: null, // Redshift does not support arrays
      comment: row.column_comment || null,
      bksField: this.parseTableColumn(row),
    }));
  }


  async getTableProperties(_table: string, _schema?: string): Promise<TableProperties> {
    return null;
  }

  async getPrimaryKeys(table: string, schema?: string): Promise<PrimaryKeyColumn[]> {
    const query = `
      select tco.constraint_schema,
             tco.constraint_name,
             kcu.ordinal_position as position,
            kcu.column_name as column_name,
            kcu.table_schema,
            kcu.table_name
      from information_schema.table_constraints tco
        join information_schema.key_column_usage kcu
      on kcu.constraint_name = tco.constraint_name
        and kcu.constraint_schema = tco.constraint_schema
        and kcu.constraint_name = tco.constraint_name
      where tco.constraint_type = 'PRIMARY KEY'
        ${schema ? `and kcu.table_schema = '${escapeString(schema)}'` : ''}
        and kcu.table_name = '${escapeString(table)}'
      order by tco.constraint_schema,
        tco.constraint_name,
        kcu.ordinal_position;
    `;

    const data = await this.driverExecuteSingle(query);
    if (data.rows) {
      return data.rows.map((r) => ({
        columnName: r.column_name,
        position: r.position
      }));
    } else {
      return [];
    }
  }

  async getOutgoingKeys(_db: string, table: string, schema: string = this._defaultSchema): Promise<TableKey[]> {
    // Query for foreign keys FROM this table (outgoing - referencing other tables)
    const sql = `
      SELECT

        kcu.constraint_schema AS from_schema,

        kcu.table_name AS from_table,

        kcu.column_name AS from_column,
        rc.unique_constraint_schema AS to_schema,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule,

        (SELECT kcu2.table_name
         FROM information_schema.key_column_usage AS kcu2
         WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_table,
        (SELECT kcu2.column_name
         FROM information_schema.key_column_usage AS kcu2
         WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_column
      FROM
        information_schema.key_column_usage AS kcu

          JOIN
        information_schema.table_constraints AS tc

        ON
          tc.constraint_name = kcu.constraint_name

          JOIN
        information_schema.referential_constraints AS rc
        ON
          rc.constraint_name = kcu.constraint_name
      WHERE
        tc.constraint_type = 'FOREIGN KEY' AND
        kcu.table_schema NOT LIKE 'pg_%' AND
        kcu.table_schema = $2 AND
        kcu.table_name = $1;
    `;

    const params = [
      table,
      schema,
    ];

    const data = await this.driverExecuteSingle(sql, { params });

    // For now, treat all keys as non-composite until we can properly test with Redshift
    // TODO: Implement proper composite key detection for Redshift
    return data.rows.map((row) => ({
      toTable: row.to_table,
      toSchema: row.to_schema,
      toColumn: row.to_column,
      fromTable: row.from_table,
      fromSchema: row.from_schema,
      fromColumn: row.from_column,
      constraintName: row.constraint_name,
      onUpdate: row.update_rule,
      onDelete: row.delete_rule,
      isComposite: false
    }));
  }

  async getIncomingKeys(_db: string, table: string, schema: string = this._defaultSchema): Promise<TableKey[]> {
    // Query for foreign keys TO this table (incoming - other tables referencing this table)
    const sql = `
      SELECT
        kcu.constraint_schema AS from_schema,
        kcu.table_name AS from_table,
        kcu.column_name AS from_column,
        rc.unique_constraint_schema AS to_schema,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule,
        (SELECT kcu2.table_name
         FROM information_schema.key_column_usage AS kcu2
         WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_table,
        (SELECT kcu2.column_name
         FROM information_schema.key_column_usage AS kcu2
         WHERE kcu2.constraint_name = rc.unique_constraint_name) AS to_column
      FROM
        information_schema.key_column_usage AS kcu
          JOIN
        information_schema.table_constraints AS tc
        ON
          tc.constraint_name = kcu.constraint_name
          JOIN
        information_schema.referential_constraints AS rc
        ON
          rc.constraint_name = kcu.constraint_name
      WHERE
        tc.constraint_type = 'FOREIGN KEY' AND
        kcu.table_schema NOT LIKE 'pg_%' AND
        rc.unique_constraint_schema = $2 AND
        (SELECT kcu2.table_name
         FROM information_schema.key_column_usage AS kcu2
         WHERE kcu2.constraint_name = rc.unique_constraint_name) = $1;
    `;

    const params = [
      table,
      schema,
    ];

    const data = await this.driverExecuteSingle(sql, { params });

    // For now, treat all keys as non-composite until we can properly test with Redshift
    // TODO: Implement proper composite key detection for Redshift
    return data.rows.map((row) => ({
      toTable: row.to_table,
      toSchema: row.to_schema,
      toColumn: row.to_column,
      fromTable: row.from_table,
      fromSchema: row.from_schema,
      fromColumn: row.from_column,
      constraintName: row.constraint_name,
      onUpdate: row.update_rule,
      onDelete: row.delete_rule,
      isComposite: false
    }));
  }
  async getTableCreateScript(table: string, schema: string = this._defaultSchema): Promise<string> {
    const data = await this.driverExecuteSingle(`show table ${this.wrapIdentifier(schema)}.${this.wrapIdentifier(table)}`);

    return data.rows.map((row) => row[data.columns[0].name])[0];
  }

  async createDatabase(databaseName: string, charset: string, _collation: string): Promise<string> {
    const sql = `create database ${this.wrapIdentifier(databaseName)} encoding ${this.wrapIdentifier(charset)}`;

    await this.driverExecuteSingle(sql);
    return databaseName;
  }

  async setElementNameSql(elementName: string, newElementName: string, typeOfElement: DatabaseElement, schema: string = this._defaultSchema) {
    elementName = this.wrapIdentifier(elementName)
    newElementName = this.wrapIdentifier(newElementName)
    schema = this.wrapIdentifier(schema)

    let sql = ''

    if (typeOfElement === DatabaseElement.TABLE || typeOfElement === DatabaseElement.VIEW) {
      sql = `ALTER TABLE ${elementName} RENAME TO ${newElementName};`
    } else if (typeOfElement === DatabaseElement.SCHEMA) {
      sql = `ALTER SCHEMA ${elementName} RENAME TO ${newElementName};`
    }

    return sql
  }

  protected countQuery(_options: STQOptions, baseSQL: string): string {
    return `SELECT COUNT(*) as total ${baseSQL}`;
  }

  protected async configDatabase(server: IDbConnectionServer, database: { database: string }) {
    // If a temporary user is used to connect to the database, we populate it below.
    let tempUser: string;

    // If the password for the database can expire, we populate passwordResolver with a callback
    // that can be used to resolve the latest password.
    let passwordResolver: () => Promise<string>;

    const iamOptions = server.config.iamAuthOptions;
    const redshiftOptions = server.config.redshiftOptions;
    if (iamOptions?.iamAuthenticationEnabled) {

      const clusterConfig: ClusterCredentialConfiguration = {
        awsRegion: iamOptions.awsRegion,
        clusterIdentifier: redshiftOptions.clusterIdentifier,
        dbName: database.database,
        dbUser: server.config.user,
        dbGroup: redshiftOptions.databaseGroup,
        durationSeconds: server.config.options.tokenDurationSeconds,
        isServerLess: redshiftOptions.isServerless
      };

      const credentialResolver = RedshiftCredentialResolver.getInstance();

      const awsCreds = await resolveAWSCredentials(iamOptions);

      // We need resolve credentials once to get the temporary database user, which does not change
      // on each call to get credentials.
      // This is usually something like "IAMA:<user>" or "IAMA:<user>:<group>".
      tempUser = (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbUser;

      // Set the password resolver to resolve the Redshift credentials and return the password.
      passwordResolver = async () => {
        return (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbPassword;
      }
    }


    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: passwordResolver || server.config.password || undefined,
      database: database.database,
      max: BksConfig.db.redshift.maxConnections, // max idle connections per time (30 secs)
      connectionTimeoutMillis: BksConfig.db.redshift.connectionTimeout,
      idleTimeoutMillis: BksConfig.db.redshift.connectionTimeout,
    };

    return this.configurePool(config, server, tempUser);
  }

  protected async getTypes(): Promise<any> {
    const sql = `
      SELECT      n.nspname as schema, t.typname as typename, t.oid::integer as typeid
      FROM        pg_type t
        LEFT JOIN   pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE       (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid))
        AND     t.typname !~ '^_'
        AND     n.nspname NOT IN ('pg_catalog', 'information_schema');
    `;

    const data = await this.driverExecuteSingle(sql);
    const result: any = {};
    data.rows.forEach((row: any) => {
      result[row.typeid] = row.typename;
    });
    _.merge(result, _.invert(pg.types.builtins))
    result[1009] = 'array';
    return result;
  }
}
