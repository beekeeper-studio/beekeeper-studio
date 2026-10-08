export type PluginMetadataMethod =
  | 'listSchemas'
  | 'listTableColumns'
  | 'listMaterializedViewColumns'
  | 'getOutgoingKeys'
  | 'getIncomingKeys'
  | 'listTableIndexes'
  | 'getPrimaryKeys';

export interface CapturedPluginQuery {
  text: string;
  numberOfRecords: number;
}

export interface PluginMetadataResult {
  result: any;
  queries: CapturedPluginQuery[];
}
