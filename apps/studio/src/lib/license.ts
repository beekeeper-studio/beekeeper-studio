import { TransportLicenseKey } from "@/common/transport";
import _ from "lodash";

export interface BaseVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface Version extends BaseVersion {
  channel: 'stable' | 'beta' | 'alpha'
  channelRelease?: number
}

export enum DevLicenseState {
  firstInstall,
  onTrial,
  trialExpired,
  activePaidLicense,
  expiredLifetimeCoversThisVersion,
  expiredLifetimeCoversEarlierVersion,
}

/**
 * Usage:
 *
 * ```
 * const v1 = parseVersion('5.1.0')
 * console.log(v1.major, v1.minor, v.patch)
 * ```
 **/
export function parseVersion(version: string) {
  const versionTagRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const match = versionTagRegex.exec(version) || [];
  const [major, minor, patch] = _.tail(match).map((x) => parseInt(x));
  return { major, minor, patch };
}

/** Check if version a is less than or equal to version b */
export function isVersionLessThanOrEqual(a: BaseVersion, b: BaseVersion) {
  if (a.major > b.major) return false;
  if (a.minor > b.minor) return false;
  if (a.patch > b.patch) return false;
  return true;
}

export class LicenseStatus {
  edition: "community" | "ultimate"
  condition: string[]
  license?: TransportLicenseKey

  get isUltimate() {
    return this.edition === "ultimate";
  }

  get isCommunity() {
    return this.edition === "community";
  }

  get isTrial() {
    return this.license?.licenseType === "TrialLicense";
  }

  get isValidDateExpired() {
    return this.condition.includes("Expired valid date");
  }

  get isSupportDateExpired() {
    return this.condition.includes("Expired support date");
  }

  get maxAllowedVersion() {
    return parseVersion(this.license?.maxAllowedAppRelease?.tagName?.slice(1) ?? '0.0.0');
  }
}
