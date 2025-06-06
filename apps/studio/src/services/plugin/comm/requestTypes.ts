import { QueryResult } from "./commonTypes";

interface BaseRequest {
  id: string;
}

export interface GetTablesRequest extends BaseRequest {
  name: "getTables";
  args: {
    schema?: string;
  };
}

export interface GetColumnsRequest extends BaseRequest {
  name: "getColumns";
  args: {
    table: string;
    schema?: string;
  };
}

export interface GetConnectionInfoRequest extends BaseRequest {
  name: "getConnectionInfo";
}

export interface GetActiveTabRequest extends BaseRequest {
  name: "getActiveTab";
}

export interface GetAllTabsRequest extends BaseRequest {
  name: "getAllTabs";
}

export interface RunQueryRequest extends BaseRequest {
  name: "runQuery";
  args: {
    query: string;
  };
}

export interface ExpandTableResultRequest extends BaseRequest {
  name: "expandTableResult";
  args: {
    results: QueryResult[];
  };
}

export interface SetTabTitleRequest extends BaseRequest {
  name: "setTabTitle";
  args: {
    title: string;
  };
}

export type PluginRequestData =
  | GetTablesRequest
  | GetColumnsRequest
  | GetConnectionInfoRequest
  | GetActiveTabRequest
  | GetAllTabsRequest
  | RunQueryRequest
  | ExpandTableResultRequest
  | SetTabTitleRequest;
