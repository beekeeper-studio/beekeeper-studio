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

export type Platform = "windows" | "mac" | "linux";

export type KeybindingTarget = "electron" | "v-hotkey" | "codemirror" | "ui";

export type FileHelpers = {
  save: (options: SaveFileOptions) => Promise<void>;
}

export type KeybindingSection = {
  /**
   * The section key matching the config metadata.
   * @example "keybindings.general"
   */
  sectionKey: string;
  /**
   * The human-readable section label for display in the UI.
   * @example "General"
   */
  label: string;
  /** An array of keybinding actions in this section. */
  actions: {
    /**
     * The action key matching the config metadata property.
     * @example "refresh"
     */
    key: string;
    /**
     * The human-readable action label for display in the UI.
     * @example "Refresh"
     */
    label: string;
    /**
     * The keybinding combinations for this action.
     * Each inner array represents a single key combination.
     * @example [["Control", "R"], ["F5"]]
     */
    keybindings: string[][];
  }[];
};

type ConfigMetadataProperty = {
  key: string;
  label: string;
};

type ConfigMetadataSection = {
  key: string;
  label: string;
  properties: ConfigMetadataProperty[];
};

export type ConfigMetadata = {
  sections: ConfigMetadataSection[];
};

