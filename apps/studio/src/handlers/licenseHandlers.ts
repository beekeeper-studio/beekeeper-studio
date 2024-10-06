import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";
import { TransportLicenseKey } from "@/common/transport";
import { CloudClient } from "@/lib/cloud/CloudClient";
import { LicenseStatus } from "@/lib/license";

export interface ILicenseHandlers {
  "license/createTrialLicense": () => Promise<void>;
  "license/getStatus": () => Promise<LicenseStatus>;
  "license/add": ({ email, key }: { email: string; key: string; }) => Promise<TransportLicenseKey>;
  "license/get": () => Promise<TransportLicenseKey[]>;
}

export const LicenseHandlers: ILicenseHandlers = {
  "license/createTrialLicense": async function () {
    await LicenseKey.createTrialLicense();
  },
  "license/getStatus": async function () {
    const status = await LicenseKey.getLicenseStatus();
    return {
      ...status,
      isUltimate: status.isUltimate,
      isCommunity: status.isCommunity,
      isTrial: status.isTrial,
      isValidDateExpired: status.isValidDateExpired,
      isSupportDateExpired: status.isSupportDateExpired,
      maxAllowedVersion: status.maxAllowedVersion,
    };
  },
  "license/add": async function ({ email, key }: { email: string; key: string; }) {
    const result = await CloudClient.getLicense( platformInfo.cloudUrl, email, key);
    // if we got here, license is good.
    await LicenseKey.wipe();
    const license = new LicenseKey();
    license.key = key;
    license.email = email;
    license.validUntil = new Date(result.validUntil);
    license.supportUntil = new Date(result.supportUntil);
    license.maxAllowedAppRelease = result.maxAllowedAppRelease;
    license.licenseType = result.licenseType;
    await license.save();
    return license;
  },
  "license/get": async function () {
    return await LicenseKey.find();
  }
};
