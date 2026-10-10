import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import globals from "@/common/globals";
import { PluginSystemError } from "@/lib/errors";
import { Module, ModuleOptions } from "@/services/plugin/Module";

export class LicenseModule extends Module {
  constructor(options: ModuleOptions) {
    super(options);

    this.hook("before-install-plugin", this.guardInstall)
  }

  private async guardInstall(_pluginId: string): Promise<void> {
    const license = await LicenseKey.getLicenseStatus();
    const plugins = await this.manager.getPlugins();

    if (license.isUltimate) {
      return;
    }

    if (plugins.filter((p) => p.origin !== 'bundled').length > globals.plugins.maxCommunityPlugins) {
      throw new PluginSystemError(
        "PLUGIN_LIMIT_REACHED",
        `You have reached the maximum of ${globals.plugins.maxCommunityPlugins} community plugins`
      )
    }
  }
}
