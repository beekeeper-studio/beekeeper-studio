import { broadcast } from "@/handlers/handlerState";
import { ThemeModule, type ThemeModuleOptions } from "./ThemeModule";

/** Tells every window when the active theme's stylesheet changes on disk. */
export class ThemeFileChangedModule extends ThemeModule {
  constructor(options: ThemeModuleOptions) {
    super(options);

    this.hook("theme-file-changed", (themeId) => {
      broadcast({ type: "themeFileChanged", input: themeId });
    });
  }
}
