import { QueryResult } from "@/lib/db/models";


export interface QueryHandlers {
  'query/execute': ({ queryId }: { queryId: string }) => Promise<QueryResult>,
  'query/cancel': ({ queryId }: { queryId: string }) => Promise<void>
}
