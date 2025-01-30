import { TransportLicenseKey } from "@/common/transport";
import { isVersionLessThanOrEqual, parseVersion, Version } from "@/common/version";
import platformInfo from '@/common/platform_info'
export interface BksVersion extends Version {
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

export class LicenseStatus {
  edition: "community" | "ultimate"
  condition: string[]
  license?: TransportLicenseKey
  fromFile?: boolean = false
  noLicenseKey?: boolean = false
  filePath?: string = undefined

  constructor(licenses: any[], missingError = null) {
    this.condition = []

    const currentDate = new Date();
    const currentVersion = platformInfo.parsedAppVersion;


    // Do they have a license at all?
    if (licenses.length === 0) {
      this.edition = "community";
      this.noLicenseKey = true
      const errorMessage = missingError ?? "No license found"
      this.condition.push(errorMessage);
      return
    }

    const currentLicense = _.orderBy(licenses, ["validUntil"], ["desc"])[0];
    this.license = currentLicense;
    this.fromFile = currentLicense.fromFile

    if (currentDate > currentLicense.supportUntil) {
      this.condition.push("Expired support date");
    }

    // Is the license not valid?
    if (currentDate > currentLicense.validUntil) {
      this.edition = "community";
      this.condition.push("Expired valid date");
      return
    }

    // From here, we know that the license is still valid.
    // Is maxAllowedAppRelease nullish?
    if (_.isNil(currentLicense.maxAllowedAppRelease)) {
      this.edition = "ultimate";
      this.condition.push("No app version restriction");
      return
    }

    // Does the license allow the current app version?
    if (isVersionLessThanOrEqual(currentVersion, this.maxAllowedVersion)) {
      this.edition = "ultimate";
      this.condition.push("App version allowed");
      return
    }

    this.edition = "community";
    this.condition.push("App version not allowed");
  }

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
