import { state } from "@/handlers/handlerState";
import {
  DriverDepManager,
  DriverDepStatus,
  DriverDepProviderInfo,
  DownloadProgress,
} from "@/services/driverDeps";

interface IDriverDepHandlers {
  "driverDep/statuses": () => Promise<DriverDepStatus[]>;
  "driverDep/status": (args: {
    requirementId: string;
  }) => Promise<DriverDepStatus>;
  "driverDep/providerInfo": (args: {
    requirementId: string;
  }) => Promise<DriverDepProviderInfo | null>;
  "driverDep/install": (args: {
    requirementId: string;
    sId: string;
  }) => Promise<string>;
  "driverDep/checkForUpdate": (args: {
    requirementId: string;
  }) => Promise<boolean>;
  "driverDep/remove": (args: { requirementId: string }) => Promise<void>;
  "driverDep/requirementForSettingKey": (args: {
    settingKey: string;
  }) => Promise<string | null>;
}

export const DriverDepHandlers: (
  manager: DriverDepManager
) => IDriverDepHandlers = (manager) => ({
  "driverDep/statuses": async () => {
    return manager.getStatuses();
  },
  "driverDep/status": async ({ requirementId }) => {
    return manager.getStatus(requirementId);
  },
  "driverDep/providerInfo": async ({ requirementId }) => {
    return manager.getProviderInfo(requirementId);
  },
  "driverDep/install": async ({ requirementId, sId }) => {
    return manager.install(requirementId, {
      onProgress(progress: DownloadProgress) {
        try {
          state(sId).port.postMessage({
            type: `onDriverDepProgress/${requirementId}`,
            input: progress,
          });
        } catch {
          // Port may be closed if renderer navigated away
        }
      },
    });
  },
  "driverDep/checkForUpdate": async ({ requirementId }) => {
    return manager.checkForUpdate(requirementId);
  },
  "driverDep/remove": async ({ requirementId }) => {
    return manager.remove(requirementId);
  },
  "driverDep/requirementForSettingKey": async ({ settingKey }) => {
    return manager.getRequirementIdForSettingKey(settingKey);
  },
});
