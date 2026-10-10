import _ from "lodash";
import { PluginSnapshot } from "@/services/plugin";
import { Module, ModuleOptions } from "@/services/plugin/Module";
import { PluginSystemError } from "@/lib/errors";
import { BksConfig } from "@/common/bksConfig/BksConfigProvider";

type ConfigurationOptions = {
  config: BksConfig;
};

/**
 * Handles plugin configuration via `config.ini`.
 *
 * Plugins can be configured via [pluginSystem] and [plugins.<pluginId>] sections.
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
 */
export class ConfigurationModule extends Module {
  constructor(private options: ConfigurationOptions & ModuleOptions) {
    super(options);

    this.setManagerRegistryFlags();
    this.hook("before-install-plugin", this.validatePluginInstall);
    this.hook("plugin-snapshots", this.applyConfig);
    this.hook("config-reload", this.onConfigReload);
  }

  static with(options: ConfigurationOptions) {
    return class extends ConfigurationModule {
      constructor(baseOptions: ModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private onConfigReload(config: BksConfig) {
    this.options.config = config;

    this.setManagerRegistryFlags();
  }

  private setManagerRegistryFlags() {
    this.manager.registry.communityDisabled = false;
    this.manager.registry.officialDisabled = false;

    if (this.options.config.pluginSystem.disabled) {
      this.manager.registry.communityDisabled = true;
      this.manager.registry.officialDisabled = true;
    }

    if (this.options.config.pluginSystem.officialDisabled) {
      this.manager.registry.officialDisabled = true;
    }

    if (this.options.config.pluginSystem.communityDisabled) {
      this.manager.registry.communityDisabled = true;
    }
  }

  private validatePluginInstall(): void {
    if (this.options.config.pluginSystem.disabled) {
      throw new PluginSystemError("PLUGIN_SYSTEM_DISABLED");
    }
  }

  private applyConfig(snapshots: PluginSnapshot[]): PluginSnapshot[] {
    return snapshots.map((snapshot) => {
      // Do not override disable state
      if (snapshot.disableState.disabled) {
        return snapshot;
      }

      if (this.options.config.pluginSystem.disabled) {
        if (this.options.config.pluginSystem.allow.includes(snapshot.manifest.id)) {
          return snapshot;
        }

        return {
          ...snapshot,
          disableState: { disabled: true, reason: "plugin-system-disabled" },
        };
      }

      if (
        snapshot.origin === "official" &&
        this.options.config.pluginSystem.officialDisabled
      ) {
        return {
          ...snapshot,
          disableState: {
            disabled: true,
            reason: "official-plugins-disabled"
          }
        }
      }

      if (
        snapshot.origin === "community" &&
        this.options.config.pluginSystem.communityDisabled
      ) {
        return {
          ...snapshot,
          disableState: {
            disabled: true,
            reason: "community-plugins-disabled",
          },
        };
      }

      if (
        snapshot.origin === "custom" &&
        this.options.config.pluginSystem.thirdPartyRegistriesDisabled
      ) {
        return {
          ...snapshot,
          disableState: {
            disabled: true,
            reason: "custom-registries-disabled",
          }
        }
      }

      if (
        snapshot.origin === "unlisted" &&
        this.options.config.pluginSystem.unlistedDisabled
      ) {
        return {
          ...snapshot,
          disableState: {
            disabled: true,
            reason: "unlisted-disabled"
          }
        }
      }

      if (this.options.config.plugins?.[snapshot.manifest.id]?.disabled) {
        return {
          ...snapshot,
          disableState: { disabled: true, reason: "disabled-by-config" },
        };
      }

      return snapshot;
    });
  }
}
