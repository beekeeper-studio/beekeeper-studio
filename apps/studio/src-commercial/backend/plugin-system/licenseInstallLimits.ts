import { LicenseStatus } from "@/lib/license";
import { PluginManager } from "@/services/plugin";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import rawLog from "@bksLogger";

const log = rawLog.scope("licenseConstraints");

let bound = false;

export default function bindLicenseInstallLimits(
  manager: PluginManager,
  licenseStatus: LicenseStatus
) {
  if (bound) {
    log.warn("License constraints already bound!");
    return;
  }

  manager.on("beforeInstallPlugin", (id) => {
    if (licenseStatus.edition === "ultimate") {
      if (licenseStatus.license!.licenseType === "BusinessLicense") {
        // No limit
        return;
      }

      // From here, it's personal or trial

      if (manager.getPlugins().length >= 5) {
        throw new ForbiddenPluginError(
          "You have reached the maximum of 5 plugins allowed in the ultimate edition."
          + " To install this plugin, you can either uninstall an existing one"
          + " or upgrade to remove this limit."
        );
      }
    }

    if (licenseStatus.edition === "community" || !licenseStatus.license) {
      if (id.startsWith("bks-")) {
        throw new ForbiddenPluginError(
          `Plugin "${id}" is not available for the ${licenseStatus.edition} edition.`
        );
      }

      if (manager.getPlugins().length >= 2) {
        throw new ForbiddenPluginError(
          "You have reached the maximum of 2 community plugins allowed in the community edition."
          + " To install this plugin, you can either uninstall an existing one"
          + " or upgrade to remove this limit."
        );
      }
    }
  });
}
