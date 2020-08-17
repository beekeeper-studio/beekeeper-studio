// Copyright (c) 2015 The SQLECTRON Team
import { createConnection } from './client';
import { CLIENTS } from './clients';

export function createServer(serverConfig) {
  if (!serverConfig) {
    throw new Error('Missing server configuration');
  }

  if (!CLIENTS.some((cli) => cli.key === serverConfig.client)) {
    throw new Error('Invalid SQL client');
  }

  const server = {
    /**
     * All connected dbs
     */
    db: {},

    config: {
      ...serverConfig,
      host: serverConfig.host || serverConfig.socketPath,
    },
  };

  /**
  * Server public API
  */
  return {
    db(dbName) {
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

    createConnection(dbName, cryptoSecret) {
      if (server.db[dbName]) {
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

      server.db[dbName] = createConnection(server, database, cryptoSecret);

      return server.db[dbName];
    },
  };
}
