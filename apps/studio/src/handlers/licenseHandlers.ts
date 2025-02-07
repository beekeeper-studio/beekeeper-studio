import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";
import { TransportLicenseKey } from "@/common/transport";
import { CloudClient } from "@/lib/cloud/CloudClient";
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
  "license/get": async function () {
    return await LicenseKey.find();
  },
  "license/wipe": async function() {
    await LicenseKey.wipe();
  }
};
