import type { RequestPayload, ResponsePayload } from "@beekeeperstudio/plugin/dist/internal";
import PluginStoreService from "./web/PluginStoreService";
import rawLog from "@bksLogger";
import type { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { FileHelpers } from "@/types";

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

export type RawPluginRegistryEntry = {
  id: string;
  name: string;
  description: string;
  author: string;
  repo: string;
};

export type PluginRegistryEntry = RawPluginRegistryEntry & {
  /** Data not defined in plugins.json, but derived or enriched at runtime */
  metadata: {
    origin: PluginOrigin;
  },
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

export type WebPluginLoaderContext = {
  manifest: Manifest;
  store: PluginStoreService;
  utility: UtilityConnection;
  log: ReturnType<typeof rawLog.scope>;
  appVersion: string;
  fileHelpers: FileHelpers;
  disabled: boolean;
}

export type PluginSnapshot = DisableState & {
  /** From the plugin's manifest.json */
  manifest: ManifestV1;
  /** Is this compatible with the current app version? */
  compatible: boolean;
  origin: PluginOrigin;
};

/* Disable state is controlled by hooks, e.g., bindLicenseConstraints and bindIniConfig. */
type DisableState = ({
  disabled: false;
} | {
  disabled: true;
  disableReasons: DisableReason[];
});

/** IMPORTANT: If you add a new type here, be sure to update the messages in DisableReason.vue */
export type DisableReason =
  | {
    source: "license";
    cause: "max-plugins-reached" | "max-community-plugins-reached" | "valid-license-required";
    /** The limit of plugins that can be used. Defined if the cause is
     * `"max-plugins-reached"` or `"max-community-plugins-reached"`. */
    limit?: number;
  }
  | { source: "config" };

/**
 * Plugins can be obtained from three sources:
 * - `core` => https://github.com/beekeeper-studio/beekeeper-studio-plugins/blob/main/plugins.json
 * - `community` => https://github.com/beekeeper-studio/beekeeper-studio-plugins/blob/main/community-plugins.json
 * - `unpublished` => None of the above
 */
export type PluginOrigin = "core" | "community" | "unpublished";

export type WebPluginManagerStatus = "initializing" | "ready" | "failed-to-initialize";

export type WebPluginViewInstance = {
  iframe: HTMLIFrameElement;
  /** For `getViewContext` API */
  context: any;
}

export type UIPlugin = {
  readonly origin: PluginOrigin;

  // Infos that are available from plugins.json
  readonly id: Manifest['id'];
  readonly name: Manifest['name'];
  readonly author: Manifest['author'];
  readonly description: Manifest['description'];

  /** To find out if it's compatible, we must try to install it and see if it fails or not.
   * After that, this property will be set. */
  compatible?: boolean;
  installing: boolean;
  installed: boolean;
  installedVersion?: string;

  updateAvailable: boolean;
  checkingForUpdates: null | boolean;

  minAppVersion?: Manifest['minAppVersion'];
  repo?: string;
  error?: Error;
} & DisableState;

export type RawFetchRegistryResult = {
  core: RawPluginRegistryEntry[];
  community: RawPluginRegistryEntry[];
  errors: {
    core: Error | null;
    community: Error | null;
  }
}
