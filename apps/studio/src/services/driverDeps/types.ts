export type DepPlatform = 'linux' | 'mac' | 'windows';
export type DepArch = 'x64' | 'arm64';

/**
 * Driver-deps in one paragraph: the database driver reads a filesystem path
 * from a `UserSetting` (e.g. `oracleInstantClient`). A `DriverDepProvider`
 * supplies the files for that same setting key — it downloads, extracts, and
 * writes the resulting path back into the setting. The `settingKey` is the
 * only contract between the driver and the provider; nothing else is shared.
 *
 * See docs/development/driver-dependencies.md for the full walkthrough.
 */

/** What a database driver declares it needs. */
export interface DriverRequirement {
  /** Unique ID for this dependency, e.g. "oracle-instant-client". */
  id: string;
  /** Human-readable name, e.g. "Oracle Instant Client". */
  name: string;
  /**
   * The `UserSetting` key the install path is written to.
   *
   * THIS IS THE INTEGRATION CONTRACT. The driver reads its filesystem path
   * from this setting; the provider writes the install path here after a
   * successful download. The field on the connection form must be a
   * `SettingsInput` bound to the same key — that binding is what makes the
   * auto-download button appear next to it.
   */
  settingKey: string;
  /** Whether this dep is strictly required or optional. */
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

/**
 * Supplies the files for a driver requirement.
 *
 * Providers are self-describing: each one declares the requirement it
 * fulfills (including the `settingKey` it writes to) and the connection
 * types it applies to. After a successful install, the manager writes the
 * resulting path into `requirement.settingKey` so existing driver code that
 * already reads that setting needs no changes.
 *
 * See docs/development/driver-dependencies.md.
 */
export interface DriverDepProvider {
  /** The dependency this provider fulfills. The `settingKey` on this
   *  requirement is where the install path will be written. */
  readonly requirement: DriverRequirement;
  /** Connection types (e.g. ["oracle"]) for which this dep should appear. */
  readonly connectionTypes: string[];
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
