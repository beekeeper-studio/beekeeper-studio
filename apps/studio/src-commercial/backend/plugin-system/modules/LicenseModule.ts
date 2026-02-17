import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { PluginSnapshot } from "@/services/plugin";
import { Module, ModuleOptions } from "@/services/plugin/Module";
import { ForbiddenPluginError } from "@/services/plugin/errors";
import globals from "@/common/globals";

/**
 * Enforces license-based limitations on plugin installation and activation.
 *
 * License tiers and limits:
 * - Pro+: Unlimited plugins
 * - Indie: Max 5 plugins (any type)
 * - Free: Max 2 community plugins, no core plugins
 *
 * @example
 *
 * ```ts
 * const pluginManager = new PluginManager({ ... });
 * pluginManager.registerModule(LicenseModule);
 * pluginManager.initialize();
 * ```
 */
export class LicenseModule extends Module {
  constructor(options: ModuleOptions) {
    super(options);

    this.hook("before-install-plugin", this.guardInstall);
    this.hook("plugin-snapshots", this.applyLicenseLimits);
  }

  private async guardInstall(pluginId: string): Promise<void> {
    const license = await LicenseKey.getLicenseStatus();
    const plugins = await this.manager.getPlugins();

    if (license.tier === "pro+") {
      return;
    }

    if (license.tier === "indie") {
      if (plugins.length < globals.maxPluginsForIndie) {
        return;
      }

      throw new ForbiddenPluginError(
        `You have reached the maximum of ${globals.maxPluginsForIndie} plugins allowed in your license.` +
        " To install this plugin, please uninstall an existing one" +
        " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }

    const entry = await this.manager.registry.findEntry(pluginId);

    if (entry.origin === "official") {
      throw new ForbiddenPluginError(
        `Plugin ${entry.entry.name} (${entry.entry.id}) is not available for the ${license.tier} tier.`
      );
    }

    // This includes community and unlisted plugins
    const communityPlugins = plugins.filter((p) => p.origin !== "official");
    if (communityPlugins.length >= globals.maxCommunityPluginsForFree) {
      throw new ForbiddenPluginError(
        `You have reached the maximum of ${globals.maxCommunityPluginsForFree} community plugins.` +
        " To install this plugin, please uninstall an existing one" +
        " or upgrade the app https://beekeeperstudio.io/pricing"
      );
    }
  }

  private async applyLicenseLimits(
    snapshots: PluginSnapshot[]
  ): Promise<PluginSnapshot[]> {
    const license = await LicenseKey.getLicenseStatus();

    if (license.tier === "pro+") {
      return snapshots;
    }

    let enabledCount = 0;

    return snapshots.map((snapshot) => {
      if (snapshot.disableState.disabled) {
        return snapshot;
      }

      if (license.tier === "indie") {
        if (enabledCount < globals.maxPluginsForIndie) {
          enabledCount++;
          return snapshot;
        }

        return {
          ...snapshot,
          disableState: {
            disabled: true as const,
            reason: "disabled-by-license" as const,
            detail: {
              cause: "max-plugins-reached" as const,
              limit: globals.maxPluginsForIndie,
            },
          },
        };
      }

      // Free tier
      if (snapshot.origin === "official") {
        return {
          ...snapshot,
          disableState: {
            disabled: true as const,
            reason: "disabled-by-license" as const,
            detail: {
              cause: "valid-license-required" as const,
            },
          },
        };
      }

      if (enabledCount >= globals.maxCommunityPluginsForFree) {
        return {
          ...snapshot,
          disableState: {
            disabled: true as const,
            reason: "disabled-by-license" as const,
            detail: {
              cause: "max-community-plugins-reached" as const,
              limit: globals.maxCommunityPluginsForFree,
            },
          },
        };
      }

      enabledCount++;
      return snapshot;
    });
  }
}
