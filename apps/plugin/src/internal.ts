// This file is used by the Beekeeper Studio plugin system (a.k.a the host)

import {
  AppInfo,
  AppTheme,
  Column,
  ConnectionInfo,
  JsonValue,
  OpenQueryTabOptions,
  OpenTableStructureTabOptions,
  OpenTableTableTabOptions,
  PluginErrorObject,
  PrimaryKey,
  QueryResult,
  RequestFileSaveOptions,
  RunQueryResult,
  Table,
  TableIndex,
  TableKey,
  WindowEventObject,
  WorkspaceInfo,
} from "./types";

export type RequestMap = {
  getSchemas: {
    args: void;
    return: string[];
  };
  getTables: {
    args: {
      schema?: string;
    };
    return: Table[];
  };
  getColumns: {
    args: {
      table: string;
      schema?: string;
    };
    return: Column[];
  };
  getTableKeys: {
    args: {
      table: string;
      schema?: string;
    };
    return: TableKey[];
  };
  getPrimaryKeys: {
    args: {
      table: string;
      schema?: string;
    };
    return: PrimaryKey[];
  };
  getTableIndexes: {
    args: {
      table: string;
      schema?: string;
    };
    return: TableIndex[];
  };
  getIncomingKeys: {
    args: {
      table: string;
      schema?: string;
    };
    return: TableKey[];
  };
  getOutgoingKeys: {
    args: {
      table: string;
      schema?: string;
    };
    return: TableKey[];
  };
  getConnectionInfo: {
    args: void;
    return: ConnectionInfo;
  };
  getWorkspaceInfo: {
    args: void;
    return: WorkspaceInfo;
  };
  getAppInfo: {
    args: void;
    return: AppInfo;
  };
  checkForUpdate: {
    args: void;
    return: boolean;
  };
  runQuery: {
    args: {
      query: string;
    };
    return: RunQueryResult;
  };
  expandTableResult: {
    args: {
      results: QueryResult[];
    };
    return: void;
  };
  setTabTitle: {
    args: {
      title: string;
    };
    return: void;
  };
  getViewContext: {
    args: void;
    return: any;
  };
  getViewState: {
    args: void;
    return: any;
  };
  setViewState: {
    args: {
      state: any;
    };
    return: void;
  };
  openExternal: {
    args: {
      link: string;
    };
    return: void;
  };
  getData: {
    args: {
      key: string;
    };
    return: any;
  };
  setData: {
    args: {
      key: string;
      value: any;
    };
    return: void;
  };
  getEncryptedData: {
    args: {
      key: string;
    };
    return: any;
  };
  setEncryptedData: {
    args: {
      key: string;
      value: any;
    };
    return: void;
  };
  openTab: {
    args:
    | ({ type: "query" } & OpenQueryTabOptions)
    | ({ type: "tableTable" } & OpenTableTableTabOptions)
    | ({ type: "tableStructure" } & OpenTableStructureTabOptions);
    return: void;
  };
  requestFileSave: {
    args: RequestFileSaveOptions;
    return: void;
  };
  toggleStatusBarUI: {
    args: { force?: boolean };
    return: void;
  };
  confirm: {
    args: {
      title?: string;
      message?: string;
      options?: {
        confirmLabel?: string;
        cancelLabel?: string;
      };
    };
    return: boolean;
  };
  "clipboard.writeText": {
    args: {
      text: string;
    };
    return: void;
  };
  "clipboard.writeImage": {
    args: {
      data: string;
    };
    return: void;
  };
  "clipboard.readText": {
    args: void;
    return: string;
  };
  "cloudStorage.connection.setItem": {
    args: {
      key: string;
      value: any;
    };
    return: void;
  };
  "cloudStorage.connection.getItem": {
    args: {
      key: string;
    };
    return: any;
  };
  "noty.success": {
    args: {
      message: string;
    };
    return: void;
  };
  "noty.error": {
    args: {
      message: string;
    };
    return: void;
  };
  "noty.info": {
    args: {
      message: string;
    };
    return: void;
  };
  "noty.warning": {
    args: {
      message: string;
    };
    return: void;
  };
};

export type RequestPayload = {
  [K in keyof RequestMap]: {
    id: string;
    name: K;
    args: RequestMap[K]["args"];
  };
}[keyof RequestMap];

export type ResponsePayload = {
  [K in keyof RequestMap]: {
    id: string;
    result: RequestMap[K]["return"];
    error?: unknown;
  };
}[keyof RequestMap];

export type NotificationMap = {
  tablesChanged: {
    args: void;
  };
  broadcast: {
    args: {
      message: JsonValue;
    };
  };
  themeChanged: {
    args: AppTheme;
  };
  windowEvent: {
    args: WindowEventObject;
  };
  pluginError: {
    args: PluginErrorObject;
  };
  dataPollSucceeded: {
    args: void;
  };
};
