import { TransportLicenseKey } from "@/common/transport";
import { parseVersion, Version } from "@/common/version";
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
  fromFile = false
  filePath?: string = undefined

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

  /**
   * A paid license whose subscription (support) period has ended, but which
   * still grants lifetime usage of app versions released within that period.
   */
  get isLifetime() {
    return this.isSupportDateExpired && !this.isValidDateExpired;
  }

  /**
   * Cloud Workspaces are a hosted service and require an active
   * subscription. Lifetime licenses only cover use of the app itself.
   */
  get canAccessCloudWorkspaces() {
    return this.isUltimate && !this.isLifetime;
  }

  get maxAllowedVersion() {
    return parseVersion(this.license?.maxAllowedAppRelease?.tagName?.slice(1) ?? '0.0.0');
  }
}
