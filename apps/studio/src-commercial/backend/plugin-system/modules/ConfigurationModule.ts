import _ from "lodash";
import { PluginSnapshot } from "@/services/plugin";
import { Module, ModuleOptions } from "@/services/plugin/Module";
import { BksConfig } from "@/common/bksConfig/BksConfigProvider";

type ConfigurationOptions = {
  config: BksConfig;
};

/**
 * Handles plugin configuration via `config.ini`.
 *
 * @example
 *
 * ```ts
 * // Register the module
 * const pluginManager = new PluginManager({ ... });
 * pluginManager.registerModule(ConfigurationModule.with({ config: bksConfig }));
 * // Initialize the plugin manager
 * pluginManager.initialize();
 *
 * ```
 *
 * The ini file contains the following:
 *
 * ```ini
 * [plugins.general]
 * communityDisabled = true
 * ```
 */
export class ConfigurationModule extends Module {
  private config: BksConfig;

  constructor(options: ConfigurationOptions & ModuleOptions) {
    super(options);

    this.config = options.config;

    this.hook("plugin-snapshots", this.applyConfig);
  }

  static with(options: ConfigurationOptions) {
    return class extends ConfigurationModule {
      constructor(baseOptions: ModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private applyConfig(snapshots: PluginSnapshot[]): PluginSnapshot[] {
    return snapshots.map((snapshot) => {
      // Do not override disable state
      if (snapshot.disableState.disabled) {
        return snapshot;
      }

      if (this.config.plugins?.[snapshot.manifest.id]?.disabled) {
        return {
          ...snapshot,
          disableState: { disabled: true, reason: "disabled-by-config" },
        };
      }

      return snapshot;
    });
  }
}
