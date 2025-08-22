import { PluginRequestData, PluginResponseData } from "@beekeeperstudio/plugin";
import { SemVer } from "semver";

/**
 * The kind of the tab. There is only one kind currently:
 *
 * - `shell`: Like a query tab. This tab has two main parts; A plugin's
 *   `<iframe>` (placed at the top), and a table component (placed at the
 *   bottom). The table can be collapsed completely.
 **/
export type TabKind = "shell";

export type View = {
  /** The id of the view.
   *  NOTE: Don't worry about collisions. Beekeeper Studio prefix this with plugin id internally. */
  id: string;
  /** The name of the view that will be displayed in the UI */
  name: string;
  /** The type of the view. */
  type: "primary-sidebar" | "secondary-sidebar" | "shell-tab" | "plain-tab";
    /** The html entry point of the view. For example, `index.html`. */
  entry: string;
}

export interface Manifest {
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
  capabilities: {
    /** Use `View` object instead of `tabTypes`. `tabTypes` is only for backward compatibility. */
    views:
      | View[]
      | {
      tabTypes?: {
        id: string;
        name: string;
        kind: TabKind;
        /** Same as `entry` above. */
        entry: string;
      }[];
    };
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
  request: PluginRequestData;
  after: (callback: (response: PluginResponseData) => void) => void;
  modifyResult: (callback: (result: PluginResponseData['result']) => PluginResponseData['result'] | Promise<PluginResponseData['result']>) => void;
}

export type PluginSettings = {
  [pluginId: string]: {
    autoUpdate: boolean;
  }
}
