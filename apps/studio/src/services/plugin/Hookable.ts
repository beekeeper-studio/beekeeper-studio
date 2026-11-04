export type AnyHandler = (...args: any[]) => any;

type HookableModule<Hooks> = {
  hooks: { name: keyof Hooks; handler: AnyHandler }[];
};

type HookableModuleClass<Manager, Hooks> =
  new (options: { manager: Manager }) => HookableModule<Hooks>;

type Args<Handler> = Handler extends AnyHandler ? Parameters<Handler> : never;
type Result<Handler> = Handler extends AnyHandler ? ReturnType<Handler> : never;

export abstract class Hookable<Manager, Hooks> {
  private modules: HookableModule<Hooks>[] = [];

  registerModule(this: Manager & Hookable<Manager, Hooks>, moduleCls: HookableModuleClass<Manager, Hooks>) {
    this.modules.push(new moduleCls({ manager: this }));
  }

  /** Run all handlers for a side-effect hook (no return value). */
  protected async callHook<K extends keyof Hooks>(
    name: K,
    ...args: Args<Hooks[K]>
  ) {
    for (const module of this.modules) {
      for (const hook of module.hooks) {
        if (hook.name === name) {
          await hook.handler(...args);
        }
      }
    }
  }

  /** Run all handlers for a waterfall hook, piping data through each handler. */
  protected async applyHook<K extends keyof Hooks>(
    name: K,
    ...args: Args<Hooks[K]>
  ) {
    let value = args[0];
    const rest = args.slice(1);
    for (const module of this.modules) {
      for (const hook of module.hooks) {
        if (hook.name === name) {
          value = await hook.handler(value, ...rest);
        }
      }
    }
    return value as Result<Hooks[K]>;
  }
}
