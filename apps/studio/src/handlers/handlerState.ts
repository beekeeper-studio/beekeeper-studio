import { IConnection } from "@/common/interfaces/IConnection";
import { BasicDatabaseClient } from "@/lib/db/clients/BasicDatabaseClient";
import { CancelableQuery } from "@/lib/db/models";
import { IDbConnectionPublicServer } from "@/lib/db/server";
import { Export } from "@/lib/export";
import { SqlGenerator } from "@shared/lib/sql/SqlGenerator";
import { MessagePortMain } from "electron";

class State {
  port: MessagePortMain = null
  server: IDbConnectionPublicServer = null;
  usedConfig: IConnection = null;
  connection: BasicDatabaseClient<any> = null;
  database: string = null;
  username: string = null;
  queries: Map<string, CancelableQuery> = new Map();
  generator: SqlGenerator = null;
  exports: Map<string, Export> = new Map();
}

const states = new Map<string, State>();

// I kinda hate this tbh. modifying could be scary
export function state(id: string): State {
  return states.get(id);
}

export function newState(id: string): void {
  states.set(id, new State());
}

export function removeState(id: string): void {
  states.delete(id);
}

export const errorMessages = {
  noUsername: 'No username provided',
  noGenerator: 'No sql generator found',
  noDatabase: 'No database connection found',
  noServer: 'No server found',
  noQuery: 'Query not found',
  noExport: 'Export not found'
};

export function getDriverHandler(name: string) {
  return async function({sId }: { sId: string }): Promise<any> {
    return await state(sId).connection[name]();
  }
}

export function checkConnection(sId: string) {
  if (!state(sId).connection) {
    throw new Error(errorMessages.noDatabase);
  }
}

