import type { SaveFileOptions } from "./backend/lib/FileHelpers";
import type { AppEvent } from "./common/AppEvent";
import type { TransportOpenTabInit } from "./common/transport/TransportOpenTab";

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

export type CustomMenuAction<TabContext = {}> =
  | { event: AppEvent.newCustomTab; args: TransportOpenTabInit<TabContext>; }
  | { event: Exclude<AppEvent, AppEvent.newCustomTab>; args?: JsonValue; };

export type ExternalMenuItem<TabContext = {}> = {
  id: string;
  parentId: string;
  label: string;
  disableWhenDisconnected?: boolean;
  action: CustomMenuAction<TabContext>;
};

export type FileHelpers = {
  save: (options: SaveFileOptions) => Promise<void>;
}

