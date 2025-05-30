import { PluginRequestData, PluginResponseData } from "./comm";

/**
 * The kind of the tab. There is only one kind currently:
 *
 * - `shell`: Like a query tab. This tab has two main parts; A plugin's
 *   `<iframe>` (placed at the top), and a table component (placed at the
 *   bottom). The table can be collapsed completely.
 **/
export type TabKind = "shell";

export interface Manifest {
  id: string;
  name: string;
  author: string;
  description: string;
  version: string;
  minAppVersion: string;
  capabilities: {
    views: {
      sidebars?: {
        id: string;
        name: string;
        location: "secondary";
        /** The path to the entry html file of the sidebar. This is relative to the plugin's root directory. */
        entry: string;
      }[];
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
  settings: {
    id: string;
    name: string;
    type: "string" | "number" | "boolean";
    description: string;
    default: string | number | boolean;
  }[];
  permissions: unknown[];
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

export type OnViewRequestListener = (params: {
  source: HTMLIFrameElement;
  request: PluginRequestData;
  after: (callback: (response: PluginResponseData) => void) => void;
}) => void | Promise<void>;

export type PluginSettings = {
  [pluginId: string]: {
    autoUpdate: boolean;
  }
}

export * from "./comm";
