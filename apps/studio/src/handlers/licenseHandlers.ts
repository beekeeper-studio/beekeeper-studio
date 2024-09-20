import { LicenseKey } from "@/common/appdb/models/LicenseKey";

export interface ILicenseHandlers {
  "license/createTrialLicense": () => Promise<void>;
}

export const LicenseHandlers: ILicenseHandlers = {
  "license/createTrialLicense": async function () {
    await LicenseKey.createTrialLicense();
  },
};
