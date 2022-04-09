// Copyright (c) 2015 The SQLECTRON Team
import { createConnection, DBConnection, IDbConnectionServer, IDbConnectionServerConfig } from './client';
import { CLIENTS, isClientFeatureSupported } from './clients';

export interface IDbConnectionPublicServer {
  db: (dbName: string) => DBConnection
  disconnect: () => void
  end: () => void
  createConnection: (dbName?: string, cryptoSecret?: string) => DBConnection
}

export function createServer(config: IDbConnectionServerConfig): IDbConnectionPublicServer {
  if (!config) {
    throw new Error('Missing server configuration');
  }

  const client = CLIENTS.find((cli) => cli.key === config.client)

  if (!client) {
    throw new Error('Invalid SQL client');
  }

  if(config.socketPathEnabled && !isClientFeatureSupported(client, 'server:socketPath')) {
    throw new Error(`${client.name} does not support socket path`);
  }

  const server: IDbConnectionServer = {
    /**
     * All connected dbs
     */
    db: {},
    config,
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

      if(dbName === null && config.client === 'postgresql') {
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
