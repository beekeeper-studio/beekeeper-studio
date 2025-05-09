import { TabType } from "@/store/models";

export type ThemeType = "dark" | "light";

export interface ThemePalette {
  themeBg: string;
  themeBase: string;
  themePrimary: string;
  themeSecondary: string;

  textDark: string;
  text: string;
  textLight: string;
  textLighter: string;
  textHint: string;
  textDisabled: string;

  brandInfo: string;
  brandSuccess: string;
  brandWarning: string;
  brandDanger: string;
  brandDefault: string;
  brandPurple: string;
  brandPink: string;

  borderColor: string;
  linkColor: string;
  placeholder: string;
  selection: string;
  inputHighlight: string;
}

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

export interface GetThemeRequest extends BaseRequest {
  name: "getTheme";
}

export interface UpdateQueryTextRequest extends BaseRequest {
  name: "updateQueryText";
  args: {
    tabId: number;
    query: string;
  };
}

export type PluginRequestData =
  | GetTablesRequest
  | GetColumnsRequest
  | GetConnectionInfoRequest
  | GetActiveTabRequest
  | UpdateQueryTextRequest
  | GetThemeRequest;

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

export interface GetActiveTabResponse {
  type: TabType;
  data?: Record<string, any>;
}

export type GetThemeResponse = {
  type: ThemeType;
  /** The palette colors in hex format */
  palette: {
    themeBg: string;
    themeBase: string;
    themePrimary: string;
    themeSecondary: string;
  };
  cssString: string;
};

export interface UpdateQueryTextResponse {}

export interface PluginResponseData {
  id: string;
  result:
    | GetThemeResponse
    | GetTablesResponse
    | GetColumnsResponse
    | GetConnectionInfoResponse
    | GetActiveTabResponse
    | UpdateQueryTextResponse;
  error?: Error;
}

export interface ThemeChangedNotification {
  name: "themeChanged";
}

export type PluginNotificationData = ThemeChangedNotification;
