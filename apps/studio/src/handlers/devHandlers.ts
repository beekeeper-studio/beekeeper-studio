import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";

export interface IDevHandlers {
  "dev/switchLicenseState": ({ label, sId }: { label: string; sId: string; }) => Promise<void>;
}

export const DevHandlers: IDevHandlers = {
  "dev/switchLicenseState": async function ({ label, sId }: { label: string; sId: string; }) {
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1));
    switch (label) {
      case "First time install, no license, no trial.":
        await LicenseKey.clear();
        break;
      case "On a trial license":
        await LicenseKey.clear();
        await LicenseKey.createTrialLicense();
        break;
      case "Trial expired": {
        await LicenseKey.clear();
        const license = await LicenseKey.createTrialLicense();
        license.validUntil = yesterday;
        license.supportUntil = yesterday;
        await license.save();
        break;
      }
      case "On an active paid license": {
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
      case "On an expired, lifetime license, that covers this version": {
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
      case "On an expired, lifetime license, that covers an earlier version": {
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
