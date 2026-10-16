import { AsyncLocalStorage } from 'node:async_hooks';
import type { CapturedPluginQuery, PluginMetadataResult } from '@/common/interfaces/PluginMetadata';
import type { BasicDatabaseClient, QueryLogOptions } from './clients/BasicDatabaseClient';
import bksConfig from '@/common/bksConfig';
import { dialectFor } from '@/shared/lib/dialects/models';
import { deparameterizeQuery } from './sql_tools';
import rawLog from '@bksLogger';

const log = rawLog.scope('PluginMetadata');
const capturedQueries = new AsyncLocalStorage<CapturedPluginQuery[]>();

// Each metadata request gets its own capture, including parallel driver calls.
export async function capturePluginMetadata(operation: () => Promise<any>): Promise<PluginMetadataResult> {
  const queries: CapturedPluginQuery[] = [];
  const result = await capturedQueries.run(queries, operation);
  return { result, queries };
}

export function capturePluginQuery(client: BasicDatabaseClient<any, any>, query: string, options: QueryLogOptions): void {
  const queries = capturedQueries.getStore();
  if (!queries || options.status !== 'completed' || !query.trim()) return;

  try {
    let text = query;
    const params = options.options?.params;
    if (params && Object.keys(params).length) {
      if (!client.knex) throw new Error('Parameter rendering requires a SQL dialect');
      const dialect = dialectFor(client.connectionType);
      if (!dialect) throw new Error('Unknown SQL dialect');
      const dbType = client.connectionType === 'postgresql' ? 'postgres' : client.connectionType;
      const paramTypes = bksConfig.db[dbType]?.paramTypes as Parameters<typeof deparameterizeQuery>[3];
      const render = (value: any): string => client.knex.raw('?', [value]).toQuery();
      const values = Array.isArray(params)
        ? paramTypes?.positional === false
          ? Object.fromEntries(params.map((value, index) => [String(index + 1), render(value)]))
          : params.map(render)
        : Object.fromEntries(Object.entries(params).map(([key, value]) => [key.replace(/^[:@$]/, ''), render(value)]));
      text = deparameterizeQuery(query, dialect, values, paramTypes);
    }
    queries.push({ text, numberOfRecords: options.numberOfRecords ?? 0 });
  } catch (error) {
    // A history entry must not prevent the plugin from loading its metadata.
    log.warn('Unable to capture plugin metadata query', error);
  }
}
