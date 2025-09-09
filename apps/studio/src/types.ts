import { AppEvent } from "./common/AppEvent";

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

export type CustomMenuAction = {
  event: AppEvent;
  args?: JsonValue;
}

export type ExternalMenuItem = {
  id: string;
  parentId: string;
  label: string;
  enableWhenConnected?: boolean;
  action: CustomMenuAction;
};

