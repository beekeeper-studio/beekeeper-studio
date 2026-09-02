import type PluginManager from "./PluginManager";
import type { PluginSnapshot } from "./types";

export type PluginSourcePathParams = {
  sourceDir: string;
  id: string;
  removeSourceDir: boolean;
};

/** Hooks that run for side effects. */
export interface CallHookMap {
  /** Before initializing the plugin manager */
  beforeInitialize: () => void | Promise<void>;

  /** After the plugin manager is ready to be used */
  afterInitialize: () => void | Promise<void>;

  /** Also triggered before updating a plugin */
  beforeInstallPlugin: (pluginId: string) => void | Promise<void>;
}

/** Hooks that pipe a value through each handler. */
export interface ApplyHookMap {
  /** Use it to adjust the state of a plugin — e.g. marking one as
   * disabled — or to add and remove entries. */
  pluginSnapshots: (
    snapshots: PluginSnapshot[]
  ) => PluginSnapshot[] | Promise<PluginSnapshot[]>;
}

export type ModuleHookMap = CallHookMap & ApplyHookMap;

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
