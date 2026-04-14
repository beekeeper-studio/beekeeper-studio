import type PluginManager from "./PluginManager";

export interface ModuleHookMap {
  "before-initialize": () => void | Promise<void>;
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
  private _hooks: ModuleHook[] = [];

  constructor(options: ModuleOptions) {
    this.manager = options.manager;
  }

  /**
   * Register a handler to run during a lifecycle hook.
   */
  protected hook<K extends keyof ModuleHookMap>(
    name: K,
    handler: ModuleHookMap[K],
  ) {
    this._hooks.push({ name, handler: handler.bind(this) } as ModuleHook);
  }

  get hooks(): ReadonlyArray<ModuleHook> {
    return this._hooks;
  }
}

export type ModuleClass = new (options: ModuleOptions) => Module;
