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

  manager.addInstallGuard((id) => {
    if (license.tier === "pro+") {
      // No limit
      return;
    }

    if (license.tier === "indie") {
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
        `Plugin "${id}" is not available for the ${license.tier} tier.`
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
    if (license.tier === "pro+") {
      // No limit
      return context;
    }

    const enabledPlugins = plugins.filter((p) => !p.disabled);

    if (license.tier === "indie") {
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
