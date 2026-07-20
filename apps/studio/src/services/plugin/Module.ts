import type PluginManager from "./PluginManager";
import type { Manifest, PluginSnapshot } from "./types";
import type { PluginDraft } from "./PluginDraft";

export interface ModuleHookMap {
  "before-initialize": () => void | Promise<void>;
  "after-scan-plugins": (plugins: Manifest[]) => void | Promise<void>;
  "before-install-plugin": (pluginId: string) => void | Promise<void>;
  "after-stage-plugin": (draft: PluginDraft) => void | Promise<void>;
  "plugin-snapshots": (
    snapshots: PluginSnapshot[]
  ) => PluginSnapshot[] | Promise<PluginSnapshot[]>;
}

export type ModuleHook = {
  [K in keyof ModuleHookMap]: {
    name: K;
    handler: ModuleHookMap[K];
  };
}[keyof ModuleHookMap];

export type ModuleOptions = {
  manager: PluginManager;
};

export abstract class Module {
  manager: PluginManager;
  /** Modules with a higher priority run their hooks first. Defaults to 0. */
  readonly priority: number = 0;
  private _hooks: ModuleHook[] = [];

  constructor(options: ModuleOptions) {
    this.manager = options.manager;
  }

  /**
   * Register a handler to run during a lifecycle hook.
   */
  protected hook<K extends keyof ModuleHookMap>(
    name: K,
    handler: ModuleHookMap[K]
  ) {
    this._hooks.push({ name, handler: handler.bind(this) } as ModuleHook);
  }

  get hooks(): ReadonlyArray<ModuleHook> {
    return this._hooks;
  }
}

export type ModuleClass = new (options: ModuleOptions) => Module;
