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
  const versionTagRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
  const match = versionTagRegex.exec(version) || [];
  const [major, minor, patch] = _.tail(match).map((x) => parseInt(x));
  return { major, minor, patch };
}

/** Check if version a is less than or equal to version b */
export function isVersionLessThanOrEqual(a: Version, b: Version) {
  return (a.major < b.major) ||
         (a.major === b.major && a.minor < b.minor) ||
         (a.major === b.major && a.minor === b.minor && a.patch <= b.patch);
}

