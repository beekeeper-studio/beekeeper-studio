export interface Manifest {
  id: string;
  name: string;
  author: string;
  description: string;
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

export * from "./comm";
