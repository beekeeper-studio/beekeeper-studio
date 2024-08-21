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
