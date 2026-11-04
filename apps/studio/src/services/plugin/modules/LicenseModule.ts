import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import globals from "@/common/globals";
import { PluginSystemError } from "@/lib/errors";
import { PluginSnapshot } from "@/services/plugin";
import { PluginModule, type PluginModuleOptions } from "./PluginModule";

export class LicenseModule extends PluginModule {
  constructor(options: PluginModuleOptions) {
    super(options);

    this.hook("before-install-plugin", this.guardInstall);
    this.hook("plugin-snapshots", this.applyLicenseLimits);
  }

  private async guardInstall(_pluginId: string): Promise<void> {
    const license = await LicenseKey.getLicenseStatus();
    const plugins = await this.manager.getPlugins();

    if (license.isUltimate) {
      return;
    }

    if (plugins.filter((p) => p.origin !== 'bundled').length >= globals.plugins.maxCommunityPlugins) {
      throw new PluginSystemError(
        "PLUGIN_LIMIT_REACHED",
        `You have reached the maximum of ${globals.plugins.maxCommunityPlugins} plugins`
      )
    }
  }

  private async applyLicenseLimits(snapshots: PluginSnapshot[]): Promise<PluginSnapshot[]> {
    const license = await LicenseKey.getLicenseStatus();

    if (license.isUltimate) return snapshots;

    let enabledCount = 0;

    return snapshots.map((snapshot) => {
      if (snapshot.disableState.disabled || snapshot.origin === 'bundled') {
        return snapshot;
      }

      if (enabledCount < globals.plugins.maxCommunityPlugins) {
        enabledCount++;
        return snapshot;
      }

      return {
        ...snapshot,
        disableState: {
          disabled: true,
          reason: "max-plugins-reached"
        }
      }
    })
  }
}
