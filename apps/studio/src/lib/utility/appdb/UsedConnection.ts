import { IConnection, SshMode } from "@/common/interfaces/IConnection";
import { AzureAuthOptions, BigQueryOptions, CassandraOptions, LibSQLOptions, RedshiftOptions } from "@/common/appdb/models/saved_connection";
import { BaseUtilityAppDbEntity } from "./BaseUtilityAppDbEntity";
import { baseFind, baseFindOne } from "./Util";

export class UsedConnection extends BaseUtilityAppDbEntity implements IConnection {
  constructor(config?: IConnection) {
    super('used');
    if (config) {
      Object.assign(this, config);
    }
  }

  static async find(options?: any): Promise<UsedConnection[]> {
    return await baseFind('used', options, UsedConnection);
  }

  static async findOne(options?: any): Promise<UsedConnection> {
    return await baseFindOne('used', options, UsedConnection);
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
