import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import platformInfo from "@/common/platform_info";
import { DevLicenseState } from "@/lib/license";

// Start from a clean history too: LicenseKey.canStartTrial counts every
// license row ever inserted.
async function clearLicenses() {
  await LicenseKey.clear();
  await LicenseKey.query("DELETE FROM sqlite_sequence WHERE name = 'license_keys'");
}

export interface IDevHandlers {
  "dev/switchLicenseState": ({ state, sId }: { state: DevLicenseState; sId: string; }) => Promise<void>;
}

export const DevHandlers: IDevHandlers = {
  "dev/switchLicenseState": async function ({ state }: { state: DevLicenseState; sId: string; }) {
    if (!platformInfo.isDevelopment) {
      throw new Error("Not allowed");
    }

    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1));
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1));
    switch (state) {
      case DevLicenseState.firstInstall:
        await clearLicenses();
        break;
      case DevLicenseState.onTrial:
        await clearLicenses();
        await LicenseKey.createTrialLicense();
        break;
      case DevLicenseState.trialExpired: {
        await clearLicenses();
        await LicenseKey.createTrialLicense(yesterday, yesterday);
        break;
      }
      case DevLicenseState.trialExpiredLongAgo: {
        const sevenMonthsAgo = new Date(new Date().setMonth(new Date().getMonth() - 7));
        await clearLicenses();
        await LicenseKey.createTrialLicense(sevenMonthsAgo, sevenMonthsAgo);
        break;
      }
      case DevLicenseState.activePaidLicense: {
        await clearLicenses();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = nextMonth;
        license.licenseType = "PersonalLicense";
        await license.save();
        break;
      }
      case DevLicenseState.expiredLifetimeCoversThisVersion: {
        await clearLicenses();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = yesterday;
        license.licenseType = "PersonalLicense";
        license.maxAllowedAppRelease = {
          tagName: `v${platformInfo.appVersion}`,
        };
        await license.save();
        break;
      }
      case DevLicenseState.expiredLifetimeCoversEarlierVersion: {
        await clearLicenses();
        const license = new LicenseKey();
        license.email = "fake_email";
        license.key = "fake_key";
        license.validUntil = nextMonth;
        license.supportUntil = yesterday;
        license.licenseType = "PersonalLicense";

        const tagName = 'v0.0.1'
        license.maxAllowedAppRelease = { tagName };
        await license.save();
        break;
      }
      default:
        console.warn("Unknown license state");
    }
  },
};
