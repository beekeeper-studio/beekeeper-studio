import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";
import { DevLicenseState } from "@/lib/license";

export interface IDevHandlers {
  "dev/switchLicenseState": ({ type, sId }: { type: DevLicenseState; sId: string; }) => Promise<void>;
}

export const DevHandlers: IDevHandlers = {
  "dev/switchLicenseState": async function ({ type }: { type: DevLicenseState; sId: string; }) {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1));
    switch (type) {
      case DevLicenseState.firstInstall:
        await LicenseKey.clear();
        break;
      case DevLicenseState.onTrial:
        await LicenseKey.clear();
        await LicenseKey.createTrialLicense();
        break;
      case DevLicenseState.trialExpired: {
        await LicenseKey.clear();
        const license = await LicenseKey.createTrialLicense();
        license.validUntil = yesterday;
        license.supportUntil = yesterday;
        await license.save();
        break;
      }
      case DevLicenseState.activePaidLicense: {
        await LicenseKey.clear();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = nextMonth;
        license.licenseType = "PersonalLicense";
        await license.save();
        break;
      }
      case DevLicenseState.lifetimeCoversThisVersion: {
        await LicenseKey.clear();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = nextMonth;
        license.licenseType = "PersonalLicense";
        license.maxAllowedAppRelease = {
          tagName: `v${platformInfo.appVersion}`,
        };
        await license.save();
        break;
      }
      case DevLicenseState.lifetimeCoversEarlierVersion: {
        await LicenseKey.clear();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = nextMonth;
        license.licenseType = "PersonalLicense";
        const version = platformInfo.parsedAppVersion;
        const tagName = `v${version.major - 1}.${version.minor}.${version.patch}`;
        license.maxAllowedAppRelease = { tagName };
        await license.save();
        break;
      }
      default:
        console.warn("Unknown license state");
    }
  },
};
