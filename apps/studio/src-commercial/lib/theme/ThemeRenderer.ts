import { Store } from "vuex";
import { State } from "@/store/index";
import { AppEvent } from "@/common/AppEvent";

export interface ThemeRendererOptions {
  store: Store<State>;
  bus: {
    emit: (event: AppEvent, ...args: any) => void;
    on: (event: AppEvent, listener: (...args: any) => void) => void;
    off: (event: AppEvent, listener: (...args: any) => void) => void;
  };
}

export class ThemeRenderer {
  private initialized = false;

  constructor(readonly options: ThemeRendererOptions) { }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const themeParams = new URLSearchParams(window.location.search);
    const themeId = themeParams.get("themeId") ?? "default";
    const appearance = themeParams.get("appearance") ?? "auto";
    const systemDark = themeParams.get("systemDark") === "true";
    const dark = appearance === "auto" ? systemDark : appearance === "dark";

    this.apply(themeId, dark);

    this.options.store.commit("theme/setSystemDark", systemDark);
    window.main.onSystemUsesDarkColors((dark) => {
      this.options.store.commit("theme/setSystemDark", dark);
    });

    this.options.store.watch(
      (_state, getters) => ({
        themeId: getters["theme/id"],
        themeDark: getters["theme/dark"],
      }),
      ({ themeId, themeDark }) => {
        this.apply(themeId, themeDark);
        this.options.bus.emit(AppEvent.changedTheme, { themeId, themeDark });
      }
    );

    this.initialized = true;
  }

  private apply(themeId: string, dark: boolean): void {
    document.body.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.body.classList.remove(className);
      }
    });

    document.body.classList.add(`theme-${themeId}`);
    document.body.classList.toggle("dark-theme", dark);
    document.body.classList.toggle("light-theme", !dark);
  }
}
