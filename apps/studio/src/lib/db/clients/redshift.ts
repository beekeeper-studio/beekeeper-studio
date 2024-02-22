import globals from "@/common/globals";
import { PoolConfig } from "pg";
import { AWSCredentials, ClusterCredentialConfiguration, RedshiftCredentialResolver } from "../authentication/amazon-redshift";
import { IDbConnectionServer } from "../types";
import { FilterOptions, PrimaryKeyColumn, TableOrView, TableProperties } from "../models";
import { PostgresClient, STQOptions } from "./postgresql";
import { escapeString } from "./utils";
import pg from 'pg';
import { defaultCreateScript } from "./postgresql/scripts";

export class RedshiftClient extends PostgresClient {
  async listMaterializedViews(_filter?: FilterOptions): Promise<TableOrView[]> {
    return [];
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

  async getTableCreateScript(table: string, schema: string = this._defaultSchema): Promise<string> {
    const params = [
      table,
      schema,
    ];

    const data = await this.driverExecuteSingle(defaultCreateScript, { params });

    return data.rows.map((row) => row.createtable)[0];
  }

  async createDatabase(databaseName: string, charset: string, _collation: string): Promise<void> {
    const sql = `create database ${this.wrapIdentifier(databaseName)} encoding ${this.wrapIdentifier(charset)}`;

    await this.driverExecuteSingle(sql);
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

    const redshiftOptions = server.config.redshiftOptions;
    if (redshiftOptions?.iamAuthenticationEnabled) {
      const awsCreds: AWSCredentials = {
        accessKeyId: redshiftOptions.accessKeyId,
        secretAccessKey: redshiftOptions.secretAccessKey
      };

      const clusterConfig: ClusterCredentialConfiguration = {
        awsRegion: redshiftOptions.awsRegion,
        clusterIdentifier: redshiftOptions.clusterIdentifier,
        dbName: database.database,
        dbUser: server.config.user,
        dbGroup: redshiftOptions.databaseGroup,
        durationSeconds: server.config.options.tokenDurationSeconds
      };

      const credentialResolver = RedshiftCredentialResolver.getInstance();

      // We need resolve credentials once to get the temporary database user, which does not change
      // on each call to get credentials.
      // This is usually something like "IAMA:<user>" or "IAMA:<user>:<group>".
      tempUser = (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbUser;

      // Set the password resolver to resolve the Redshift credentials and return the password.
      passwordResolver = async() => {
        return (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbPassword;
      }
    }

    
    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: passwordResolver || server.config.password || undefined,
      database: database.database,
      max: 5, // max idle connections per time (30 secs)
      connectionTimeoutMillis: globals.psqlTimeout,
      idleTimeoutMillis: globals.psqlIdleTimeout,
    };

    return this.configurePool(config, server, tempUser);
  }

  protected async getTypes(): Promise<any> {
    const sql = `
      SELECT      n.nspname as schema, t.typname as typename, t.oid::int4 as typeid
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
