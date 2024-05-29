import { QueryResult } from "@/lib/db/models";
import { checkConnection, errorMessages, state } from "./handlerState";


export interface IQueryHandlers {
  'query/execute': ({ queryId }: { queryId: string }) => Promise<QueryResult>,
  'query/cancel': ({ queryId }: { queryId: string }) => Promise<void>
}

export let queryHandlers = {} as unknown as IQueryHandlers;


queryHandlers['query/execute'] = async function({ queryId }: { queryId: string }) { 
  checkConnection();
  const query = state.queries.get(queryId);
  if (!query) {
    throw new Error(errorMessages.noQuery);
  }

  const result = await query.execute();
  // not totally sure on this
  state.queries.delete(queryId);
  return result;
}

queryHandlers['query/cancel'] = async function({ queryId }: { queryId: string }) {
  checkConnection();
  const query = state.queries.get(queryId);
  if (!query) {
    throw new Error(errorMessages.noQuery);
  }

  await query.cancel();
  state.queries.delete(queryId);
}
