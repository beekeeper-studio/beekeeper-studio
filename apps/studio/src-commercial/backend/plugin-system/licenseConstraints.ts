import { LicenseStatus } from "@/lib/license";
import { PluginManager } from "@/services/plugin";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import rawLog from "@bksLogger";

const log = rawLog.scope("licenseConstraints");

let bound = false;

export default function bindLicenseConstraints(
  manager: PluginManager,
  licenseStatus: LicenseStatus
) {
  if (bound) {
    log.warn("licenseConstraints is already bound!");
    return;
  }

  manager.addInstallGuard((id) => {
    if (licenseStatus.tier === "pro+") {
      // No limit
      return;
    }

    if (licenseStatus.tier === "indie") {
      if (manager.getPlugins().length < 5) {
        return;
      }

      throw new ForbiddenPluginError(
        "You have reached the maximum of 5 plugins allowed in your license."
        + " To install this plugin, please uninstall an existing one"
        + " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }

    if (id.startsWith("bks-")) {
      throw new ForbiddenPluginError(
        `Plugin "${id}" is not available for the ${licenseStatus.tier} tier.`
      );
    }

    if (manager.getPlugins().length >= 2) {
      throw new ForbiddenPluginError(
        "You have reached the maximum of 2 community plugins allowed."
        + " To install this plugin, please uninstall an existing one"
        + " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }
  });

  manager.addPluginContextTransformer((context, plugins) => {
    if (licenseStatus.tier === "pro+") {
      // No limit
      return context;
    }

    const enabledPlugins = plugins.filter((p) => !p.disabled);

    if (licenseStatus.tier === "indie") {
      if (enabledPlugins.length < 5) {
        return context;
      }

      return { ...context, disabled: true };
    }

    if (context.manifest.id.startsWith("bks-")) {
      return { ...context, disabled: true };
    }

    if (enabledPlugins.length >= 2) {
      return { ...context, disabled: true };
    }

    return context;
  });
}
