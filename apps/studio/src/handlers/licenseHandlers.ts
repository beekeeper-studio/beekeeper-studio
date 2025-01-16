import { OfflineLicense } from "@/backend/lib/OfflineLicense";
import { ConnectionState } from "@/common/appdb/Connection";
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
  "license/remove": (({ id }: { id: number }) => Promise<void>)
}

export const LicenseHandlers: ILicenseHandlers = {
  "license/createTrialLicense": async function () {
    await LicenseKey.createTrialLicense();
  },
  "license/remove": async function({ id }){
    const key = await LicenseKey.findOneBy({ id })
    if (key) {
      await key.remove()
    }
  },
  "license/getStatus": async function () {
    // If someone has a file-based license, that takes
    // priority over ALL other licenses
    const offline = OfflineLicense.load()
    let status = null
    if (offline) {
      status = offline.toLicenseStatus()
    } else {
      await LicenseKey.getLicenseStatus();
    }
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
    const license = new LicenseKey();
    // FIXME: These operations should be inside of a transaction, so they either both happen
    // or both don't happen.
    await LicenseKey.wipe();
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
    const offline = OfflineLicense.load()
    if (offline) return [offline.toLicenseKey()]
    return await LicenseKey.find();
  }
};
