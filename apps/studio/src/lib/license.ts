import { TransportLicenseKey } from "@/common/transport";
import _ from "lodash";

interface Status {
  edition: "community" | "ultimate"
  condition: string
  license?: TransportLicenseKey
}

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

export function getLicenseStatus(options: {
  licenses: TransportLicenseKey[];
  currentDate: Date;
  currentVersion: Version;
}): Status {
  const { licenses, currentDate, currentVersion } = options;

  // Do they have a license at all?
  if (licenses.length === 0) {
    return {
      edition: "community",
      condition: "No license found",
    };
  }

  const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];

  // Is the license not valid?
  if (currentDate > currentLicense.validUntil) {
    return {
      license: currentLicense,
      edition: "community",
      condition: "License expired",
    };
  }

  // From here, we know that the license is still valid.
  // Is maxAllowedAppRelease nullish?
  if (_.isNil(currentLicense.maxAllowedAppRelease)) {
    return {
      license: currentLicense,
      edition: "ultimate",
      condition: "No app version restriction",
    };
  }

  // Does the license allow the current app version?
  if (
    isVersionLessThanOrEqual(
      currentVersion,
      parseTagVersion(currentLicense.maxAllowedAppRelease.tagName)
    )
  ) {
    return {
      license: currentLicense,
      edition: "ultimate",
      condition: "App version allowed",
    };
  }

  return {
    license: currentLicense,
    edition: "community",
    condition: "App version not allowed",
  };
}
