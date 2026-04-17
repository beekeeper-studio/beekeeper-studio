import { NgQueryResult, QueryResult } from "@/lib/db/models";
import { checkConnection, errorMessages, state } from "./handlerState";
import BksConfig from '@/common/bksConfig';
import _ from 'lodash';


export interface IQueryHandlers {
  'query/execute': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<QueryResult>,
  'query/cancel': ({ queryId, sId }: { queryId: string, sId: string }) => Promise<void>,
}

export const QueryHandlers: IQueryHandlers = {
  'query/execute': async function({ queryId, sId }: { queryId: string, sId: string }) {
    checkConnection(sId);
    const query = state(sId).queries.get(queryId);
    if (!query) {
      throw new Error(errorMessages.noQuery);
    }

    const result = await query.execute();
    state(sId).queries.delete(queryId);

    return result.map((r: NgQueryResult) => {
      r.totalRowCount = r.rowCount;
      if (r.rowCount > BksConfig.ui.queryEditor.maxResults) {
        r.rows = _.take(r.rows, BksConfig.ui.queryEditor.maxResults);
        r.truncated = true;
        r.rowCount = r.rows.length;
      }
      return r;
    });
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
