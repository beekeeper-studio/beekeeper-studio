/**
 * licenseConstraints Hook
 *
 * Enforces license-based limitations on plugin installation and activation.
 *
 * License tiers and limits:
 * - Pro+: Unlimited plugins
 * - Indie: Max 5 plugins (any type)
 * - Free: Max 2 community plugins, no core plugins
 *
 * This hook provides:
 * 1. Install guard - Prevents installing plugins beyond license limits
 * 2. Snapshot transformer - Disables plugins that exceed license limits
 */
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { PluginManager } from "@/services/plugin";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import rawLog from "@bksLogger";
import globals from '@/common/globals'

const log = rawLog.scope("plugin-system-hook:licenseConstraints");
const boundSymbol = Symbol("licenseConstraints");

export default function bindLicenseConstraints(manager: PluginManager) {
  if (manager[boundSymbol]) {
    log.warn("already bound!");
    return;
  }

  manager[boundSymbol] = true;

  manager.addInstallGuard(async ({ id, origin }) => {
    const license = await LicenseKey.getLicenseStatus();

    if (license.tier === "pro+") {
      // No limit
      return;
    }

    if (license.tier === "indie") {
      if (manager.getInstalledPlugins().length < globals.maxPluginsForIndie) {
        return;
      }

      throw new ForbiddenPluginError(
        `You have reached the maximum of ${globals.maxPluginsForIndie} plugins allowed in your license.`
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
    if (communityPlugins.length >= globals.maxCommunityPluginsForFree) {
      throw new ForbiddenPluginError(
        `You have reached the maximum of ${globals.maxCommunityPluginsForFree} community plugins.`
        + " To install this plugin, please uninstall an existing one"
        + " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }
  });

  manager.addPluginSnaphostTransformer(async (snapshot, plugins) => {
    const license = await LicenseKey.getLicenseStatus();

    if (license.tier === "pro+") {
      // No limit
      return snapshot;
    }

    const enabledPlugins = plugins.filter((p) => !p.disabled);

    if (license.tier === "indie") {
      if (enabledPlugins.length < globals.maxPluginsForIndie) {
        return snapshot;
      }

      return {
        ...snapshot,
        disabled: true,
        disableReasons: [
          ...(snapshot.disabled ? [...snapshot.disableReasons] : []),
          { source: "license", cause: "max-plugins-reached", limit: globals.maxPluginsForIndie },
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

    if (enabledPlugins.length >= globals.maxCommunityPluginsForFree) {
      return {
        ...snapshot,
        disabled: true,
        disableReasons: [
          ...(snapshot.disabled ? [...snapshot.disableReasons] : []),
          { source: "license", cause: "max-community-plugins-reached", limit: globals.maxCommunityPluginsForFree },
        ],
      };
    }

    return snapshot;
  });
}
