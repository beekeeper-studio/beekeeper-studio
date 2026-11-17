import type { AnyHandler } from "@/services/plugin/Hookable";
import type { ThemeSnapshot } from "@/services/plugin/types";
import type { ThemeManager } from "../ThemeManager";

export interface ThemeModuleHookMap {
  "after-initialize": () => void | Promise<void>;
  "theme-file-changed": (themeId: string) => void | Promise<void>;
  "before-install-theme": (themeId: string) => void | Promise<void>;
  "theme-snapshots": (
    snapshots: ThemeSnapshot[]
  ) => ThemeSnapshot[] | Promise<ThemeSnapshot[]>;
}

export type ThemeModuleOptions = {
  manager: ThemeManager;
};

export abstract class ThemeModule {
  manager: ThemeManager;
  readonly hooks: { name: keyof ThemeModuleHookMap; handler: AnyHandler }[] = [];

  constructor(options: ThemeModuleOptions) {
    this.manager = options.manager;
  }

  /**
   * Register a handler to run during a lifecycle hook.
   */
  protected hook<K extends keyof ThemeModuleHookMap>(name: K, handler: ThemeModuleHookMap[K]) {
    this.hooks.push({ name, handler: handler.bind(this) });
  }
}
