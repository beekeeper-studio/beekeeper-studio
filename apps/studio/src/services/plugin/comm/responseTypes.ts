import { TabType } from "@/common/transport/TransportOpenTab";
import { TableFilter, TableOrView } from "@/lib/db/models";
import { QueryResult } from "./commonTypes";

/** The list of tables */
export type GetTablesResponse = {
  name: string;
  schema?: string;
}[];

/** The list of columns */
export type GetColumnsResponse = {
  name: string;
  type: string;
}[];

export interface GetConnectionInfoResponse {
  connectionType: string;
  databaseName: string;
  defaultSchema?: string;
  readOnlyMode: boolean;
}

export type TabResponse = BaseTabResponse | QueryTabResponse | TableTabResponse;

export type GetActiveTabResponse = TabResponse;

export type GetAllTabsResponse = TabResponse[];

export type RunQueryResponse = {
  results: QueryResult[];
  error?: unknown;
};

export type ExpandTableResultResponse = void;

export type SetTabTitleResponse = void;

export interface PluginResponseData {
  id: string;
  result:
    | GetTablesResponse
    | GetColumnsResponse
    | GetConnectionInfoResponse
    | GetActiveTabResponse
    | GetAllTabsResponse
    | RunQueryResponse
    | ExpandTableResultResponse
    | SetTabTitleResponse;
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
