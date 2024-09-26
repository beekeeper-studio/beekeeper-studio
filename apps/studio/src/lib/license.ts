import { TransportLicenseKey } from "@/common/transport";
import _ from "lodash";

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export enum DevLicenseState {
  firstInstall,
  onTrial,
  trialExpired,
  activePaidLicense,
  lifetimeCoversThisVersion,
  lifetimeCoversEarlierVersion,
}

export function parseTagVersion(version: string) {
  const versionTagRegex = /^v(\d+)\.(\d+)\.(\d+)$/;
  const match = versionTagRegex.exec(version) || [];
  const [major, minor, patch] = _.tail(match).map((x) => parseInt(x));
  return { major, minor, patch };
}

/** Check if version a is less than or equal to version b */
export function isVersionLessThanOrEqual(a: Version, b: Version) {
  if (a.major > b.major) return false;
  if (a.minor > b.minor) return false;
  if (a.patch > b.patch) return false;
  return true;
}

export class LicenseStatus {
  edition: "community" | "ultimate"
  condition: string
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
}

export function getLicenseStatus(options: {
  licenses: TransportLicenseKey[];
  currentDate: Date;
  currentVersion: Version;
}): LicenseStatus {
  const { licenses, currentDate, currentVersion } = options;
  const status = new LicenseStatus();

  // Do they have a license at all?
  if (licenses.length === 0) {
    status.edition = "community";
    status.condition = "No license found";
    return status;
  }

  const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
  status.license = currentLicense;

  // Is the license not valid?
  if (currentDate > currentLicense.validUntil) {
    status.edition = "community";
    status.condition = "License expired";
    return status;
  }

  // From here, we know that the license is still valid.
  // Is maxAllowedAppRelease nullish?
  if (_.isNil(currentLicense.maxAllowedAppRelease)) {
    status.edition = "community";
    status.condition = "No app version restriction";
    return status;
  }

  // Does the license allow the current app version?
  if (
    isVersionLessThanOrEqual(
      currentVersion,
      parseTagVersion(currentLicense.maxAllowedAppRelease.tagName)
    )
  ) {
    status.edition = "ultimate";
    status.condition = "App version allowed";
    return status;
  }

  status.edition = "community";
  status.condition = "App version not allowed";
  return status;
}
