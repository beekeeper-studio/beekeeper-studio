import { QueryResult } from "@/lib/db/models";
import { checkConnection, errorMessages, state } from "./handlerState";


export interface IQueryHandlers {
  'query/execute': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<QueryResult>,
  'query/cancel': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<void>,
  'query/commit': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<void>,
  'query/rollback': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<void>
}

export const QueryHandlers: IQueryHandlers = {
  'query/execute': async function({ queryId, sId, isManualCommit }: { queryId: string, sId: string, isManualCommit: boolean }) {
    checkConnection(sId);
    const query = state(sId).queries.get(queryId);
    if (!query) {
      throw new Error(errorMessages.noQuery);
    }

    const result = await query.execute();
    if (!isManualCommit) {
      // not totally sure on this
      state(sId).queries.delete(queryId);
    }
    return result;
  },
  'query/cancel': async function({ queryId, sId }: { queryId: string, sId: string }) {
    checkConnection(sId);
    const query = state(sId).queries.get(queryId);
    if (!query) {
      throw new Error(errorMessages.noQuery);
    }

    await query.cancel();
    state(sId).queries.delete(queryId);
  }
}
