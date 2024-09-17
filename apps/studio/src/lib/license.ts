import { TransportLicenseKey } from "@/common/transport";
import _ from "lodash";

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export function parseTagVersion(version: string) {
  const VERSION_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
  const match = VERSION_TAG.exec(version);
  const major = match ? parseInt(match[1]) : 0;
  const minor = match ? parseInt(match[2]) : 0;
  const patch = match ? parseInt(match[3]) : 0;
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
}) {
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
  // Is maxAllowedAppVersion nullish?
  if (_.isNil(currentLicense.maxAllowedAppVersion)) {
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
      currentLicense.maxAllowedAppVersion
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
