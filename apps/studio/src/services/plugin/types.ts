export interface CommonPluginInfo {
  id: string;
  name: string;
  author: string;
  description: string;
  readme?: string;
}

export interface Manifest extends CommonPluginInfo {
  version: string;
  minAppVersion: string;
  capabilities: {
    views: {
      sidebars: {
        id: string;
        name: string;
        location: "secondary";
        /** The path to the entry html file of the sidebar. This is relative to the plugin's root directory. */
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

/** Info that is obtained from the registry repo a.k.a. beekeeper-studio/beekeeper-studio-plugins. */
export interface PluginRegistryEntry extends CommonPluginInfo {
  repo: string;
}

/** Info that is attached to git's HEAD of a plugin. This interface contains
 * the most updated info of a plugin. */
export interface PluginRepositoryInfo {
  /** Markdown representation of the plugin's README */
  readme: string;
  latestRelease: Release;
  manifest: Manifest;
}

export interface Release {
  version: string;
  sourceArchiveUrl: string;
}

export * from "./commTypes";
