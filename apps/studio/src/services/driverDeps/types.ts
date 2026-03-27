export type DepPlatform = 'linux' | 'mac' | 'windows';
export type DepArch = 'x64' | 'arm64';

/** What a database driver declares it needs */
export interface DriverRequirement {
  /** Unique ID for this dependency, e.g. "oracle-instant-client" */
  id: string;
  /** Human-readable name, e.g. "Oracle Instant Client" */
  name: string;
  /** The UserSetting key where the installed path is stored */
  settingKey: string;
  /** Whether this dep is strictly required or optional */
  required: boolean;
}

/** A platform-specific download artifact */
export interface DriverDepArtifact {
  url: string;
  platform: DepPlatform;
  arch: DepArch;
  /** Expected filename after download */
  fileName: string;
  /** SHA256 checksum for verification, if available */
  sha256?: string;
}

/** What a provider supplies for a given dependency */
export interface DriverDepProviderInfo {
  /** Must match a DriverRequirement.id */
  requirementId: string;
  /** Semver version string, e.g. "21.17.0" */
  version: string;
  /** Platform-specific artifacts */
  artifacts: DriverDepArtifact[];
  /** License name, e.g. "Oracle Free Use Terms and Conditions" */
  licenseName: string;
  /** URL to full license text */
  licenseUrl: string;
  /** URL to official documentation / manual download page */
  documentationUrl: string;
  /** Relative path within the extracted archive to the usable directory,
   *  e.g. "instantclient_21_17". If omitted, the file manager will use
   *  the first top-level directory found after extraction. */
  extractedDirName?: string;
  /** Whether the app must be restarted after installing this dependency */
  restartRequired: boolean;
  /** Platform-specific notes to display in the download modal.
   *  Only notes matching the current platform are shown. */
  notes?: DriverDepNote[];
}

export interface DriverDepNote {
  /** Which platforms this note applies to. Omit to show on all platforms. */
  platforms?: DepPlatform[];
  text: string;
}

/** A provider that can supply files for a driver requirement */
export interface DriverDepProvider {
  readonly requirementId: string;
  resolve(): Promise<DriverDepProviderInfo>;
}

/** Persisted state for an installed driver dependency */
export interface InstalledDriverDep {
  requirementId: string;
  version: string;
  installedPath: string;
  installedAt: string; // ISO date
}

/** Status of a driver dependency for the UI */
export interface DriverDepStatus {
  requirement: DriverRequirement;
  installed: boolean;
  installedVersion?: string;
  installedPath?: string;
  latestVersion?: string;
  updateAvailable: boolean;
  providerAvailable: boolean;
}

export type DownloadPhase = 'downloading' | 'extracting' | 'installing' | 'complete' | 'error';

export interface DownloadProgress {
  phase: DownloadPhase;
  percentage?: number; // 0-100
  bytesDownloaded?: number;
  totalBytes?: number;
  error?: string;
  /** URL for manual download if auto-download fails */
  manualDownloadUrl?: string;
}
