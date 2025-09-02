interface UtilProcReadyMessage {
  type: "ready";
}

interface UtilProcOpenExternalMessage {
  type: "openExternal";
  url: string;
}

export type UtilProcMessage =
  | UtilProcReadyMessage
  | UtilProcOpenExternalMessage;

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
