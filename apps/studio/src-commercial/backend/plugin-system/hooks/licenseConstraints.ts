import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { PluginManager } from "@/services/plugin";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import rawLog from "@bksLogger";

const log = rawLog.scope("plugin-system-hook:licenseConstraints");
const boundSymbol = Symbol("licenseConstraints");

export default async function bindLicenseConstraints(manager: PluginManager) {
  const license = await LicenseKey.getLicenseStatus();

  if (manager[boundSymbol]) {
    log.warn("already bound!");
    return;
  }

  manager[boundSymbol] = true;

  manager.addInstallGuard(async ({ id, origin }) => {
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

    if (origin === "core") {
      throw new ForbiddenPluginError(
        `Plugin "${id}" is not available for the ${license.tier} tier.`
      );
    }

    // This includes community and unpublished plugins
    const communityPlugins = manager.getInstalledPlugins()
      .filter((p) => p.origin !== "core");
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

      return {
        ...snapshot,
        disabled: true,
        disableReasons: [
          ...(snapshot.disabled ? [...snapshot.disableReasons] : []),
          { source: "license", cause: "max-plugins-reached", limit: 5 },
        ],
      };
    }

    if (snapshot.origin === "core") {
      return {
        ...snapshot,
        disabled: true,
        disableReasons: [
          ...(snapshot.disabled ? [...snapshot.disableReasons] : []),
          { source: "license", cause: "valid-license-required" },
        ]
      };
    }

    if (enabledPlugins.length >= 2) {
      return {
        ...snapshot,
        disabled: true,
        disableReasons: [
          ...(snapshot.disabled ? [...snapshot.disableReasons] : []),
          { source: "license", cause: "max-community-plugins-reached", limit: 2 },
        ],
      };
    }

    return snapshot;
  });
}
