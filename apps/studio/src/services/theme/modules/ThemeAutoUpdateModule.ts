import rawLog from "@bksLogger";
import type { BksConfig } from "@/common/bksConfig/BksConfigProvider";
import { ThemeModule, type ThemeModuleOptions } from "./ThemeModule";

const log = rawLog.scope("ThemeAutoUpdateModule");

type AutoUpdateOptions = {
  config: BksConfig;
};

/** Updates registry themes to their latest release once the manager is initialized. */
export class ThemeAutoUpdateModule extends ThemeModule {
  constructor(private options: AutoUpdateOptions & ThemeModuleOptions) {
    super(options);

    this.hook("after-initialize", this.updateThemes);
  }

  static with(options: AutoUpdateOptions) {
    return class extends ThemeAutoUpdateModule {
      constructor(baseOptions: ThemeModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private async updateThemes() {
    if (!this.options.config.themeSystem.autoUpdate) {
      return;
    }

    const themes = await this.manager.getThemes();
    for (const { manifest, origin, disableState } of themes) {
      if (origin === "bundled" || origin === "unlisted" || disableState.disabled) {
        continue;
      }
      try {
        if (await this.manager.checkForUpdates(manifest.id)) {
          await this.manager.updateTheme(manifest.id);
        }
      } catch (e) {
        log.warn(`Failed to auto-update theme "${manifest.id}"`, e);
      }
    }
  }
}
