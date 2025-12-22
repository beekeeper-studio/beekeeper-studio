import { LicenseStatus } from "@/lib/license";
import { PluginManager } from "@/services/plugin";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import rawLog from "@bksLogger";

const log = rawLog.scope("licenseConstraints");
const boundSymbol = Symbol("licenseConstraints");

export default function bindLicenseConstraints(
  manager: PluginManager,
  license: LicenseStatus
) {
  if (manager[boundSymbol]) {
    log.warn("licenseConstraints is already bound!");
    return;
  }

  manager[boundSymbol] = true;

  manager.addInstallGuard(async (id) => {
    if (license.tier === "pro+") {
      // No limit
      return;
    }

    if (license.tier === "indie") {
      if (manager.getInstalledPlugins().length < 5) {
        return;
      }

      throw new ForbiddenPluginError(
        "You have reached the maximum of 5 plugins allowed in your license."
        + " To install this plugin, please uninstall an existing one"
        + " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }

    const entry = manager.registry.findEntryById(id);

    if (entry.origin === "core") {
      throw new ForbiddenPluginError(
        `Plugin "${entry}" is not available for the ${license.tier} tier.`
      );
    }

    const communityPlugins = manager.getInstalledPlugins()
      .filter((p) => p.origin === "community");
    if (communityPlugins.length >= 2) {
      throw new ForbiddenPluginError(
        "You have reached the maximum of 2 community plugins allowed."
        + " To install this plugin, please uninstall an existing one"
        + " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }
  });

  manager.addPluginSnaphostTransformer(async (snapshot, plugins) => {
    if (license.tier === "pro+") {
      // No limit
      return snapshot;
    }

    const enabledPlugins = plugins.filter((p) => !p.disabled);

    if (license.tier === "indie") {
      if (enabledPlugins.length < 5) {
        return snapshot;
      }

      return { ...snapshot, disabled: true };
    }

    if (snapshot.origin === "core") {
      return { ...snapshot, disabled: true };
    }

    if (enabledPlugins.length >= 2) {
      return { ...snapshot, disabled: true };
    }

    return snapshot;
  });
}
