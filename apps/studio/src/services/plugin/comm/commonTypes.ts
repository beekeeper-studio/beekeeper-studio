export interface QueryResult {
  fields: {
    id: string;
    name: string;
    dataType?: string;
  }[];
  rows: Record<string, unknown>[];
}

