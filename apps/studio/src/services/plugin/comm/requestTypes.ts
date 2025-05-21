interface BaseRequest {
  id: string;
}

export interface GetThemeRequest extends BaseRequest {
  name: "getTheme";
}

export interface GetTablesRequest extends BaseRequest {
  name: "getTables";
  args: {
    schema: string;
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

export interface CreateQueryTabRequest extends BaseRequest {
  name: "createQueryTab";
  args: {
    query: string;
    title: string;
  };
}

export interface UpdateQueryTextRequest extends BaseRequest {
  name: "updateQueryText";
  args: {
    tabId: number;
    query: string;
  };
}

export interface RunQueryRequest extends BaseRequest {
  name: "runQuery";
  args: {
    query: string;
  };
}

export interface RunQueryTabRequest extends BaseRequest {
  name: "runQueryTab";
  args: {
    tabId: number;
  };
}

export interface RunQueryTabPartiallyRequest extends BaseRequest {
  name: "runQueryTabPartially";
  args: {
    tabId: number;
    range: { from: number; to: number };
  };
}

export interface InsertSuggestionRequest extends BaseRequest {
  name: "insertSuggestion";
  args: {
    tabId: number;
    suggestion: string;
    range: { from: number; to: number };
  };
}

export type PluginRequestData =
  | GetThemeRequest
  | GetTablesRequest
  | GetColumnsRequest
  | GetConnectionInfoRequest
  | GetActiveTabRequest
  | GetAllTabsRequest
  | CreateQueryTabRequest
  | UpdateQueryTextRequest
  | RunQueryRequest
  | RunQueryTabRequest
  | RunQueryTabPartiallyRequest
  | InsertSuggestionRequest;

