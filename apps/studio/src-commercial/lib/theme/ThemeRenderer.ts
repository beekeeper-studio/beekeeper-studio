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
  private themeId: string | null = null;
  private dark: boolean | null = null;
  private link: HTMLLinkElement | null = null;

  private media = window.matchMedia("(prefers-color-scheme: dark)");

  constructor(readonly options: ThemeRendererOptions) { }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const { themeId, dark } = this.parseThemeParams();

    this.link = document.querySelector("link#theme");

    if (!this.link) {
      throw new Error("No stylesheet link matching link#theme");
    }

    await this.apply(themeId, dark);

    document.body.classList.toggle("window-inactive", !document.hasFocus());

    this.options.store.commit("theme/setSystemDark", this.media.matches);

    this.subscribe();

    this.initialized = true;
  }

  private subscribe() {
    window.main.onWindowFocused((focused) => {
      document.body.classList.toggle("window-inactive", !focused);
    });

    window.main.onSystemUsesDarkColors((dark) => {
      this.options.store.commit("theme/setSystemDark", dark);
    });

    if (import.meta.hot) {
      import.meta.hot.on("theme-css-update", async () => {
        await this.reloadStylesheet();
      });
    }

    this.options.store.watch(
      (_state, getters) => ({
        themeId: getters["theme/id"],
        themeDark: getters["theme/dark"],
      }),
      ({ themeId, themeDark }) => this.handleThemeChanged(themeId, themeDark)
    );
  }

  private async handleThemeChanged(
    themeId: string,
    themeDark: boolean
  ): Promise<void> {
    if (themeId === this.themeId && themeDark === this.dark) {
      return;
    }

    await this.apply(themeId, themeDark);
    this.options.bus.emit(AppEvent.changedTheme, { themeId, themeDark });
  }

  private parseThemeParams() {
    const themeParams = new URLSearchParams(window.location.search);
    const themeId = themeParams.get("themeId") ?? "default";
    const appearance = themeParams.get("appearance") ?? "auto";
    const dark =
      appearance === "auto" ? this.media.matches : appearance === "dark";
    return { themeId, dark };
  }

  private async apply(themeId: string, dark: boolean): Promise<void> {
    this.themeId = themeId;
    this.dark = dark;

    document.body.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.body.classList.remove(className);
      }
    });

    document.body.classList.add(`theme-${themeId}`);
    document.body.classList.toggle("dark-theme", dark);
    document.body.classList.toggle("light-theme", !dark);

    await this.loadStylesheet(`theme://${themeId}.css`);
  }

  private async loadStylesheet(href: string): Promise<void> {
    if (this.link.getAttribute("href") === href && this.link.sheet) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.link.onload = () => resolve();
      this.link.onerror = () =>
        reject(new Error(`Failed to load stylesheet ${href}`));
      this.link.href = href;
    });
  }

  private async reloadStylesheet(): Promise<void> {
    const href = this.link.getAttribute("href");

    if (!href) {
      return;
    }

    await this.loadStylesheet(`${href.split("?")[0]}?t=${Date.now()}`);
  }
}
