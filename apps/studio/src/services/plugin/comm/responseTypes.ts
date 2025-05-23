import { TabType } from "@/common/transport/TransportOpenTab";
import { TableFilter, TableOrView } from "@/lib/db/models";

export type ThemeType = "dark" | "light";

export type GetThemeResponse = {
  type: ThemeType;
  /** The palette colors in hex format */
  palette: Record<string, string>;
  cssString: string;
};

/** The list of table names */
export type GetTablesResponse = string[];

/** The list of columns */
export type GetColumnsResponse = {
  name: string;
  type: string;
}[];

export interface GetConnectionInfoResponse {
  connectionType: string;
  defaultDatabase?: string;
  readOnlyMode: boolean;
}

export type TabResponse = BaseTabResponse | QueryTabResponse | TableTabResponse;

export type GetActiveTabResponse = TabResponse;

export type GetAllTabsResponse = TabResponse[];

export interface CreateQueryTabResponse {
  id: number;
}

export type UpdateQueryTextResponse = void;

export interface QueryResult {
  fields: {
    id: string;
    name: string;
    dataType?: string;
  }[];
  rows: Record<string, unknown>[];
}

export interface RunQueryResponse {
  results: QueryResult[];
  error?: unknown;
}

export interface RunQueryTabResponse {
  results: QueryResult[];
  error?: unknown;
}

export interface RunQueryTabPartiallyResponse {
  result: QueryResult;
  error?: unknown;
}

export interface InsertSuggestionResponse {
  suggestionId: number;
}

export interface PluginResponseData {
  id: string;
  result:
    | GetThemeResponse
    | GetTablesResponse
    | GetColumnsResponse
    | GetConnectionInfoResponse
    | GetActiveTabResponse
    | GetAllTabsResponse
    | CreateQueryTabResponse
    | UpdateQueryTextResponse
    | RunQueryResponse
    | RunQueryTabResponse
    | RunQueryTabPartiallyResponse;
  error?: Error;
}

interface QueryTabResponse extends BaseTabResponse {
  type: "query";
  data: {
    query: string;
    result: unknown;
  };
}

interface TableTabResponse extends BaseTabResponse {
  type: "table";
  data: {
    table: TableOrView;
    filters: TableFilter[] | string;
    result: unknown;
  };
}

interface BaseTabResponse {
  type: TabType;
  id: number;
  title: string;
}
