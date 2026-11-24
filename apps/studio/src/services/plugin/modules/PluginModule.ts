import type { AnyHandler } from "../Hookable";
import type PluginManager from "../PluginManager";
import type { PluginSnapshot } from "@/services/plugin/types";

export type PluginSourcePathParams = {
  sourceDir: string;
  id: string;
  removeSourceDir: boolean;
};

export interface PluginModuleHookMap {
  "before-initialize": () => void | Promise<void>;
  "before-install-plugin": (pluginId: string) => void | Promise<void>;
  "plugin-snapshots": (
    snapshots: PluginSnapshot[]
  ) => PluginSnapshot[] | Promise<PluginSnapshot[]>;
}

export type PluginModuleOptions = {
  manager: PluginManager;
};

export abstract class PluginModule {
  manager: PluginManager;
  readonly hooks: { name: keyof PluginModuleHookMap; handler: AnyHandler }[] = [];

  constructor(options: PluginModuleOptions) {
    this.manager = options.manager;
  }

  /**
   * Register a handler to run during a lifecycle hook.
   */
  protected hook<K extends keyof PluginModuleHookMap>(name: K, handler: PluginModuleHookMap[K]) {
    this.hooks.push({ name, handler: handler.bind(this) });
  }
}
