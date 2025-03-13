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
  /** Plugin manifest */
  latestRelease: Release;
}

export interface Release {
  version: string;
  manifestDownloadUrl: string;
  scriptDownloadUrl: string;
  styleDownloadUrl: string;
}

