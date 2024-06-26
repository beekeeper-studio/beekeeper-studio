import { ConnectionType, IConnection, SshMode } from "@/common/interfaces/IConnection";
import { AzureAuthOptions, BigQueryOptions, CassandraOptions, LibSQLOptions, RedshiftOptions } from "@/common/appdb/models/saved_connection";
import { BaseUtilityAppDbEntity } from "./BaseUtilityAppDbEntity";
import { ConnectionString } from "connection-string";
import rawLog from 'electron-log';
import { baseFind, baseFindOne } from "./Util";

const log = rawLog.scope('SavedConnection');

export class SavedConnection extends BaseUtilityAppDbEntity implements IConnection {
  constructor(config?: IConnection) {
    super('saved');
    if (config) {
      Object.assign(this, config);
    }
  }

  static async find(options?: any): Promise<SavedConnection[]> {
    return await baseFind('saved', options, SavedConnection);
  }

  static async findOne(options?: any): Promise<SavedConnection> {
    return await baseFindOne('saved', options, SavedConnection);
  }

  parse(url: string): boolean {
    try {
      const goodEndings = ['.db', '.sqlite', '.sqlite3']
      if (!this.smellsLikeUrl(url)) {
        // it's a sqlite file
        if (goodEndings.find((e) => url.endsWith(e))) {
          // it's a valid sqlite file
          this.connectionType = 'sqlite'
          this.defaultDatabase = url
          return true
        } else {
          // do nothing, continue url parsing
        }
      }

      const parsed = new ConnectionString(url.replaceAll(/\s/g, "%20"))
      this.connectionType = parsed.protocol as ConnectionType || this.connectionType || 'postgresql'
      if (parsed.hostname && parsed.hostname.includes('redshift.amazonaws.com')) {
        this.connectionType = 'redshift'
      }

      if (parsed.hostname && parsed.hostname.includes('cockroachlabs.cloud')) {
        this.connectionType = 'cockroachdb'
        if (parsed.params?.options) {
          // TODO: fix this
          const regex = /--cluster=([A-Za-z0-9\-_]+)/
          const clusters = parsed.params.options.match(regex)
          this.options['cluster'] = clusters ? clusters[1] : undefined
        }
      }

      if (parsed.params?.sslmode && parsed.params.sslmode !== 'disable') {
        this.ssl = true
      }
      this.host = parsed.hostname || this.host
      this.port = parsed.port || this.port
      this.username = parsed.user || this.username
      this.password = parsed.password || this.password
      this.defaultDatabase = parsed.path?.[0] ?? this.defaultDatabase
      return true
    } catch (ex) {
      log.error('unable to parse connection string, assuming sqlite file', ex)
      return false
    }
  }

  private smellsLikeUrl(url: string): boolean {
    return url.includes("://")
  }

  name: string;
  sshMode: SshMode;
  password: string;
  sshPassword: string;
  sshKeyfilePassword: string;
  id: number;
  workspaceId: number;
  connectionType: 'sqlite' | 'sqlserver' | 'redshift' | 'cockroachdb' | 'mysql' | 'postgresql' | 'mariadb' | 'cassandra' | 'oracle' | 'bigquery' | 'firebird' | 'tidb' | 'libsql';
  host: string;
  port: number;
  socketPath: string;
  socketPathEnabled: boolean;
  username: string;
  domain: string;
  defaultDatabase: string;
  uri: string;
  sshEnabled: boolean;
  sshHost: string;
  sshPort: number;
  sshKeyfile: string;
  sshUsername: string;
  sshBastionHost: string;
  sshKeepaliveInterval: number;
  ssl: boolean;
  sslCaFile: string;
  sslCertFile: string;
  sslKeyFile: string;
  sslRejectUnauthorized: boolean;
  readOnlyMode: boolean;
  labelColor?: string;
  trustServerCertificate?: boolean;
  serviceName: string;
  options?: any;
  redshiftOptions?: RedshiftOptions;
  cassandraOptions?: CassandraOptions;
  bigQueryOptions?: BigQueryOptions;
  azureAuthOptions?: AzureAuthOptions;
  authId?: number;
  libsqlOptions?: LibSQLOptions;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
