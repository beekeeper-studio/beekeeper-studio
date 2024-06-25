import { RedshiftOptions, CassandraOptions, BigQueryOptions, AzureAuthOptions, LibSQLOptions } from '@/common/appdb/models/saved_connection';
import { IConnection, SshMode } from '@/common/interfaces/IConnection';
import { Transport, TransportPinnedConn } from '@/common/transport/transport';
import Vue from 'vue';
import rawLog from 'electron-log';

const log = rawLog.scope('UtilityAppDbEntities');

abstract class BaseUtilityAppDbEntity {
  constructor(private type: string) {
    
  }

  async save(): Promise<void> {
    await Vue.prototype.$util.send(`appdb/${this.type}/save`, { obj: this });
  }

  async remove(): Promise<void> {
    await Vue.prototype.$util.send(`appdb/${this.type}/remove`, { obj: this });
  }

  static async find(_options?: any): Promise<any[]> {
    throw new Error('find not implemented. Must be overriden in base class.')
  }

  static save<T extends Transport>(_entities: T[], _options?: any): Promise<T[]> {
    throw new Error('Save multiple not implemented. Must be overriden in base class');
  }

  protected fromTransport<T extends Transport>(item: T) {
    return Object.assign(this, item);
  }
}

export class SavedConnection extends BaseUtilityAppDbEntity implements IConnection {
  constructor(config?: IConnection) {
    super('saved');
    if (config) {
      Object.assign(this, config);
    }
  }

  static async find(options?: any): Promise<any[]> {
    const items = await Vue.prototype.$util.send('appdb/saved/find', { options });
    return items.map((item) => {
      const newItem = new SavedConnection();
      return Object.assign(newItem, item);
    });
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
}

export class UsedConnection extends BaseUtilityAppDbEntity implements IConnection {
  constructor(config?: IConnection) {
    super('used');
    if (config) {
      Object.assign(this, config);
    }
  }

  static async find(options?: any): Promise<any[]> {
    const items = await Vue.prototype.$util.send('appdb/used/find', { options });
    return items.map((item) => {
      const newItem = new UsedConnection();
      return Object.assign(newItem, item);
    });
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
}

export class PinnedConnection extends BaseUtilityAppDbEntity implements TransportPinnedConn {
  constructor(connection?: SavedConnection) {
    super('pinconn');

    if (!connection) return;

    this.connectionId = connection.id;
    this.workspaceId = connection.workspaceId;
  }

  static async find(options?: any): Promise<PinnedConnection[]> {
    const items = await Vue.prototype.$util.send('appdb/pinconn/find', { options });
    return items.map((item) => {
      const newItem = new PinnedConnection();
      return Object.assign(newItem, item);
    });
  }

  static async save<T extends Transport>(entities: T[], options?: any): Promise<T[]> {
    return await Vue.prototype.$util.send('appdb/pinconn/savemult', { entities, options });
  }

  id: number | null = null;
  position: number = 99.0;
  connectionId: number;
  workspaceId: number = -1;
  connection: SavedConnection;
}
