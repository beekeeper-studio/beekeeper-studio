import _ from "lodash";

export interface Version {
  major: number;
  minor: number;
  patch: number;
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
export function isVersionLessThanOrEqual(a: Version, b: Version) {
  if (a.major > b.major) return false;
  if (a.minor > b.minor) return false;
  if (a.patch > b.patch) return false;
  return true;
}

