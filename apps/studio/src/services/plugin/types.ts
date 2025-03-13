export interface Manifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  author: string;
}

/** Info that is obtained from the registry repo. */
export interface PluginRegistryEntry {
  id: string;
  name: string;
  author: string;
  description: string;
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

