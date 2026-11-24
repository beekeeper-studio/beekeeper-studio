# Plugin Modules

Modules extend the `PluginManager` by hooking into its lifecycle events. They run in Electron's utility process and have direct access to the `PluginManager`.

## Architecture

```
Hookable (abstract)
  └─ PluginManager
       ├─ registerModule(PluginModuleClass)
       ├─ callHook(name, ...args)     ← side-effect hooks (fire-and-forget)
       └─ applyHook(name, ...args)    ← waterfall hooks (transform data)

PluginModule (abstract)
  └─ ConfigurationModule              ← existing example
```

Modules register handlers for named hooks in their constructor. The `PluginManager` triggers these hooks at specific lifecycle points. All registered handlers for a given hook run sequentially in registration order.

## The `static with()` Pattern

`registerModule()` expects a module class — a constructor that accepts only `PluginModuleOptions`:

```typescript
new (options: PluginModuleOptions) => PluginModule;
```

If your module needs additional configuration beyond the `PluginManager` reference, use the `static with()` factory method.

```typescript
static with(options: MyModuleOptions) {
  return class extends MyModule {
    constructor(baseOptions: PluginModuleOptions) {
      super({ ...baseOptions, ...options });
    }
  };
}
```

If your module has no extra options, you can register it directly:

```typescript
pluginManager.registerModule(SimpleModule);
```

## Adding New Hooks

Add the hook signature to `PluginModuleHookMap` in `src/services/plugin/modules/PluginModule.ts`:

```typescript
export interface PluginModuleHookMap {
 "before-install-plugin": (pluginId: string) => void | Promise<void>;
 "plugin-snapshots": (snapshots: PluginSnapshot[]) => PluginSnapshot[] | Promise<PluginSnapshot[]>;
 "my-new-hook": (data: SomeType) => SomeType | Promise<SomeType>;
}
```

Both side-effect and waterfall hooks coexist in the same `PluginModuleHookMap`. The difference is how the `PluginManager` calls them: `callHook` for side-effect hooks (typically `void`), `applyHook` for waterfall hooks (typically returns a type).
