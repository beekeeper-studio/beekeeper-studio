import { IConnection } from "@/common/interfaces/IConnection";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { CancelableQuery } from "@/lib/db/models";
import { IDbConnectionPublicServer } from "@/lib/db/server";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";

class State {
  server: IDbConnectionPublicServer = null;
  usedConfig: IConnection = null;
  connection: BasicDatabaseClient<any> = null;
  database: string = null;
  username: string = null;
  queries: Map<string, CancelableQuery> = new Map();
  generator: SqlGenerator = null;
}

export const state = new State();

export const errorMessages = {
  noUsername: 'No username provided',
  noGenerator: 'No sql generator found',
  noDatabase: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found'
};

export function getDriverHandler(name: string) {
  return async function(): Promise<any> {
    return await state.connection[name]();
  }
}

export function checkConnection() {
  if (!state.connection) {
    throw new Error(errorMessages.noDatabase);
  }
}

