// Copyright (c) 2015 The SQLECTRON Team
import { createConnection, DBConnection, IDbConnectionServer, IDbConnectionServerConfig } from './client';
import { CLIENTS } from './clients';

export interface IDbConnectionPublicServer {
  db: (dbName: string) => DBConnection
  disconnect: () => void
  end: () => void
  createConnection: (dbName?: string, cryptoSecret?: string) => DBConnection
}

export function createServer(serverConfig: IDbConnectionServerConfig): IDbConnectionPublicServer {
  if (!serverConfig) {
    throw new Error('Missing server configuration');
  }

  if (!CLIENTS.some((cli) => cli.key === serverConfig.client)) {
    throw new Error('Invalid SQL client');
  }

  const server: IDbConnectionServer = {
    /**
     * All connected dbs
     */
    db: {},
    config: {
      ...serverConfig,
      host: serverConfig.host || serverConfig.socketPath || undefined,
    },
  };

  /**
  * Server public API
  */
  return {
    db(dbName: string) {
      return server.db[dbName];
    },

    disconnect() {
      return this.end()
    },

    end() {
      // disconnect from all DBs
      Object.keys(server.db).forEach((key) => server.db[key].disconnect());

      // close SSH tunnel
      if (server.sshTunnel) {
        server.sshTunnel.connection.shutdown();
        server.sshTunnel = null;
      }
    },

    createConnection(dbName?: string, cryptoSecret?: string) {
      // @ts-ignore
      if (server.db[dbName]) {
        // @ts-ignore
        return server.db[dbName];
      }

      if(dbName === null && serverConfig.client === 'postgresql') {
        dbName = 'postgres'
      }

      const database = {
        database: dbName,
        connection: null,
        connecting: false,
      };

      // @ts-ignore
      server.db[dbName] = createConnection(server, database, cryptoSecret);

      // @ts-ignore
      return server.db[dbName];
    },
  } as IDbConnectionPublicServer;
}
