import type { RequestPayload, ResponsePayload } from "@beekeeperstudio/plugin/dist/internal";
import PluginStoreService from "./web/PluginStoreService";
import rawLog from "@bksLogger";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { FileHelpers, JsonValue } from "@/types";
import type Noty from "noty";

/**
 * The kind of the tab. There is only one kind currently:
 *
 * - `base-tab`: A plain tab with no special UI.
 * - `shell-tab`: Like a query tab. This tab has two main parts; A plugin's
 *   `<iframe>` (placed at the top), and a table component (placed at the
 *   bottom). The table can be collapsed completely.
 **/
export type TabType = "shell" | "base";

export type PluginView = {
  /** The id of the view. */
  id: string;
  /** The name of the view that will be displayed in the UI */
  name: string;
  /** The type of the view. */
  type: `${TabType}-tab`;
  /** The html entry point of the view. For example, `index.html`. */
  entry: string;
};

/** @alias PluginView */
export type View = PluginView;

export type PluginMenuItemPlacement =
  | "newTabDropdown" // Shown in the dropdown list when opening a new tab
  | "menubar.tools" // Shown in the tools menu
  | "editor.query.context" // Context menu inside the query editor
  | "results.cell.context" // Context menu on a cell
  | "results.columnHeader.context" // Context menu on a row header
  | "results.rowHeader.context" // Context menu on a column header
  | "results.corner.context" // Context menu on the top left corner
  | "tableTable.cell.context" // Context menu on a cell
  | "tableTable.columnHeader.context" // Context menu on a row header
  | "tableTable.rowHeader.context" // Context menu on a column header
  | "tableTable.corner.context" // Context menu on the top left corner
  | "tab.query.header.context" // Context menu on the query tab header
  | "tab.table.header.context" // Context menu on the table tab header
  | "entity.table.context" // Context menu on a table
  | "entity.schema.context" // Context menu on a schema
  | "entity.routine.context" // Context menu on a routine
  | "structure.statusbar.menu"; // Button rendered in the structure view status bar

/** A single menu item contributed by a plugin. */
export interface PluginMenuItem {
  /** The command or id of the menu item. This will be passed to the plugin. */
  command: string;

  /** User-facing label shown in the UI for this menu item. */
  name: string;

  /** The ID of a view defined in `capabilities.views`; the host opens a
   * new tab of that view. */
  view: string;

  /** Location or locations in the app where this menu item should appear,
   * expressed as a string or array of strings. */
  placement: PluginMenuItemPlacement | PluginMenuItemPlacement[];

  /** Optional group identifier for sorting and grouping items within a
   * placement.
   * @todo planned */
  group?: string;

  /** Optional numeric order for fine-grained sorting within a group, with
   * lower numbers shown first.
   * @todo planned */
  order?: number;
}

/** For NativeMenuBuilder.ts */
export type NativePluginMenuItem = {
  id: string;
  pluginId: string;
  label: string;
  command: string;
};

/** Used by earlier versions of AI Shell. */
type LegacyViews = {
  tabTypes?: {
    id: string;
    name: string;
    kind: TabType;
    /** Same as `entry` above. */
    entry: string;
  }[];
}

export type Manifest = ManifestV0 | ManifestV1;

export type ManifestV0 = {
  manifestVersion?: 0;
  id: string;
  name: string;
  author:
  | string
  | {
    name: string;
    url: string;
  };
  description: string;
  version: string;
  minAppVersion?: string;
  /** Material UI icon name. https://fonts.google.com/icons?icon.set=Material+Icons */
  icon?: string;
  /** Provide all extension points here. */
  capabilities: {
    /** The list of views provided by the plugin. */
    views: LegacyViews;
    /** The list of menu items provided by the plugin. */
    menu: PluginMenuItem[];
  };
  /** The path to the plugin's root directory. This is helpful when you use a bundler to build the project to a `dist/` directory for example. */
  pluginEntryDir?: string;
  /** @todo not yet implemented. This is a list of settings that can be configured by config files. */
  settings?: {
    id: string;
    name: string;
    type: "string" | "number" | "boolean";
    description?: string;
    default: string | number | boolean;
  }[];
  /** @todo not yet implemented */
  permissions?: (
    | "run-custom-queries"
    | "create-entities"
    | "edit-entities"
  )[];
}

export type ManifestV1 = Omit<ManifestV0, "manifestVersion" | "capabilities"> & {
  manifestVersion: 1;
  capabilities: Omit<ManifestV0["capabilities"], "views"> & {
    views: PluginView[];
  }
};

/**
 * The structure of a plugin entry.
 *
 * @see {@link https://github.com/beekeeper-studio/beekeeper-studio-plugins}
 */
export type PluginRegistryEntry = Pick<
  Manifest,
  "id" | "name" | "author" | "description"
> & {
  repo: string;
};

export interface Release {
  manifest: Manifest;
  sourceArchiveUrl: string;
}

export interface PluginRepository {
  latestRelease: Release;
  readme: string;
}

export type OnViewRequestListener = (params: OnViewRequestListenerParams) => void | Promise<void>;

export type OnViewRequestListenerParams = {
  source: HTMLIFrameElement;
  request: RequestPayload;
  after: (callback: AfterViewRequestCallback) => void;
  modifyResult: (callback: ViewResultModifier) => void;
}

export type AfterViewRequestCallback = (response: ResponsePayload) => void;

export type ViewResultModifier = (result: ResponsePayload['result']) => ResponsePayload['result'] | Promise<ResponsePayload['result']>;

export type PluginSettings = {
  [pluginId: string]: {
    autoUpdate: boolean;
    disabled?: boolean;
  }
}


export type WebPluginContext = {
  manifest: Manifest;
  store: PluginStoreService;
  utility: UtilityConnection;
  log: ReturnType<typeof rawLog.scope>;
  appVersion: string;
  fileHelpers: FileHelpers;
  noty: {
    success(text: string, options?: any): Noty;
    error(text: string, options?: any): Noty;
    warning(text: string, options?: any): Noty;
    info(text: string, options?: any): Noty;
  };
  confirm(title?: string, message?: string, options?: { confirmLabel?: string, cancelLabel?: string }): Promise<boolean>;
}

export type PluginContext = {
  manifest: Manifest;
  loadable: boolean;
}

export type WebPluginManagerStatus = "initializing" | "ready" | "failed-to-initialize";

export type WebPluginViewInstance = {
  iframe: HTMLIFrameElement;
  context: any;
}

export type CreatePluginTabOptions = {
  manifest: Manifest;
  viewId: string;
  params?: JsonValue;
  command: string;
};

/**
 * Indicates where a plugin originates from:
 * - `official`: {@link https://github.com/beekeeper-studio/beekeeper-studio-plugins/blob/main/plugins.json}
 * - `community`: {@link https://github.com/beekeeper-studio/beekeeper-studio-plugins/blob/main/community-plugins.json}
 * - `unlisted`: Not listed in either repository
 */
export type PluginOrigin = "official" | "community" | "unlisted";
