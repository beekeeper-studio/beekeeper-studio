import type { BksConfig } from "@/common/bksConfig/BksConfigProvider";
import type { ThemeSnapshot } from "@/services/plugin/types";
import { ThemeModule, type ThemeModuleOptions } from "./ThemeModule";

type ConfigurationOptions = {
  config: BksConfig;
};

/** Disables themes according to the [themeSystem] section of `config.ini`. */
export class ThemeConfigurationModule extends ThemeModule {
  constructor(private options: ConfigurationOptions & ThemeModuleOptions) {
    super(options);

    this.hook("theme-snapshots", this.applyConfig);
  }

  static with(options: ConfigurationOptions) {
    return class extends ThemeConfigurationModule {
      constructor(baseOptions: ThemeModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private applyConfig(snapshots: ThemeSnapshot[]): ThemeSnapshot[] {
    const { themeSystem } = this.options.config;

    return snapshots.map((snapshot) => {
      // Do not override disable state
      if (snapshot.disableState.disabled) {
        return snapshot;
      }

      if (snapshot.origin === "community" && themeSystem.communityDisabled) {
        return {
          ...snapshot,
          disableState: { disabled: true, reason: "community-themes-disabled" },
        };
      }

      if (snapshot.origin === "unlisted" && themeSystem.unlistedDisabled) {
        return {
          ...snapshot,
          disableState: { disabled: true, reason: "unlisted-disabled" },
        };
      }

      return snapshot;
    });
  }
}
