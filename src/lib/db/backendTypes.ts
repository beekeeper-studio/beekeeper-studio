import type { SSHConnection } from '@/vendor/node-ssh-forward/index';
import { IBasicDatabaseClient, IDbConnectionServerConfig } from './types';

export interface IDbSshTunnel {
  connection: SSHConnection,
  localHost: string,
  localPort: number,
  tunnel: Record<string, any>
}

export interface IDbConnectionServer {
  db: {
    [x: string]: IBasicDatabaseClient
  },
  sshTunnel?: Nullable<IDbSshTunnel>,
  config: IDbConnectionServerConfig,
}
