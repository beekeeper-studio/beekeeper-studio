import { BksConfig } from "@/common/bksConfig/BksConfigProvider";
import { Module, ModuleOptions } from "@/services/plugin/Module";
import platformInfo from '@/common/platform_info';
import { RegistryConfig } from "@/services/plugin";


type RegistryOptions = {
  config: BksConfig
}


export class RegistryModule extends Module {
  constructor(private options: RegistryOptions & ModuleOptions) {
    super(options);

    this.hook("before-initialize", this.addAdditionalRegistries);
    this.hook("config-reload", this.onConfigReload);
  }

  static with(options: RegistryOptions) {
    return class extends RegistryModule {
      constructor(baseOptions: ModuleOptions) {
        super({ ...baseOptions, ...options });
      }
    };
  }

  private onConfigReload(config: BksConfig) {
    this.manager.registry.clearRegistries();
    this.manager.registry.clearCache();
    this.options.config = config;

    this.addAdditionalRegistries();
  }

  private addAdditionalRegistries() {
    // this should check licenses eventually
    if (platformInfo.isDevelopment &&
      !this.options.config.pluginSystem.thirdPartyRegistriesDisabled &&
      this.options.config.pluginSystem?.registries) {
      const registries = Object.keys(this.options.config.pluginSystem.registries);
      for (const registry of registries) {
        const entry: RegistryConfig = this.options.config.pluginSystem.registries[registry];
        // No trying to override the default registries
        if (registry === 'official' || registry === 'community' || !entry) {
          continue;
        }

        this.manager.registry.addRegistry({
          name: registry,
          origin: 'custom',
          owner: entry.owner,
          repo: entry.repo,
          file: entry.file
        });
      }
    }
  }
}
