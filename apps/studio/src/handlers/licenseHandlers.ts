import { OfflineLicense } from "@/backend/lib/OfflineLicense";
import { ConnectionState } from "@/common/appdb/Connection";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { TransportLicenseKey } from "@/common/transport";
import { LicenseStatus } from "@/lib/license";

export interface ILicenseHandlers {
  "license/createTrialLicense": () => Promise<void>;
  "license/getStatus": () => Promise<LicenseStatus>;
  "license/get": () => Promise<TransportLicenseKey[]>;
  "license/remove": (({ id }: { id: number }) => Promise<void>);
  "license/wipe": () => Promise<void>;
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
  "license/get": async function () {
    const offline = OfflineLicense.load()
    if (offline) return [offline.toLicenseKey()]
    return await LicenseKey.find();
  },
  "license/wipe": async function() {
    await LicenseKey.wipe();
  }
};
