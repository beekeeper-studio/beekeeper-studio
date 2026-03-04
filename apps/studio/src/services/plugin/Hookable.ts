import type PluginManager from "./PluginManager";
import { type Module, type ModuleClass, type ModuleHookMap } from "./Module";

export abstract class Hookable {
  private modules: Module[] = [];

  registerModule(this: PluginManager, moduleCls: ModuleClass) {
    this.modules.push(new moduleCls({ manager: this }));
  }

  /** Run all handlers for a side-effect hook (no return value). */
  protected async callHook<K extends keyof ModuleHookMap>(name: K) {
    for (const module of this.modules) {
      for (const hook of module.hooks) {
        if (hook.name === name) {
          await (hook.handler as () => void | Promise<void>)();
        }
      }
    }
  }

  /** Run all handlers for a waterfall hook, piping data through each handler. */
  protected async applyHook<K extends keyof ModuleHookMap>(
    name: K,
    ...args: Parameters<ModuleHookMap[K]>
  ) {
    let value = args[0];
    const rest = args.slice(1);
    for (const module of this.modules) {
      for (const hook of module.hooks) {
        if (hook.name === name) {
          value = await (hook.handler as Function)(value, ...rest);
        }
      }
    }
    return value as ReturnType<ModuleHookMap[K]>;
  }
}
