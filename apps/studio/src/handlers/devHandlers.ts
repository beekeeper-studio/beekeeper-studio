import { getActiveWindows } from "@/background/WindowBuilder";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";

export interface IDevHandlers {
  'dev/switchLicenseState': ({ label, sId }: { label: string, sId: string }) => Promise<void>
}

export const DevHandlers: IDevHandlers = {
  'dev/switchLicenseState': async function({ label }: { label: string, sId: string }) {
    switch(label) {
      case "First time install, no license, no trial.":
        await LicenseKey.clear()
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
      case "On a trial license":
        await LicenseKey.clear()
        const validUntil = new Date(new Date().setDate(new Date().getDate() + 14))
        const trialLicense = new LicenseKey()
        trialLicense.email = 'trial_user'
        trialLicense.key = 'fake'
        trialLicense.validUntil = validUntil
        trialLicense.supportUntil = validUntil
        trialLicense.licenseType = 'TrialLicense'
        await trialLicense.save()
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
      case "Trial expired":
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
      case "On an active paid license":
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
      case "On an expired, lifetime license that still covers this version":
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
      case "On an expire, lifetime license, that covers an earlier version":
        getActiveWindows().forEach(window => window.webContents.reloadIgnoringCache())
        break
    }
  }
}
