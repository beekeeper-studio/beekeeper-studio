import { Store } from "vuex";
import { State } from "@/store/index";
import { AppEvent } from "@/common/AppEvent";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";
import { isValidManifestId } from "@/services/plugin/utils";
import rawLog from "@bksLogger";

const log = rawLog.scope("ThemeRenderer");

export interface ThemeRendererOptions {
  store: Store<State>;
  utility: UtilityConnection;
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

  private utility: UtilityConnection;
  private bus: ThemeRendererOptions["bus"];
  private store: ThemeRendererOptions["store"];

  private media = window.matchMedia("(prefers-color-scheme: dark)");

  constructor(readonly options: ThemeRendererOptions) {
    this.utility = options.utility;
    this.bus = options.bus;
    this.store = options.store;
  }

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
    await this.options.store.dispatch("theme/loadThemes");

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

    this.utility.send("theme/watch");

    this.bus.on(AppEvent.themeFileChanged, async (id: string) => {
      await this.store.dispatch("theme/loadThemes");
      if (id === this.themeId) {
        await this.reloadStylesheet();
      }
    });

    if (import.meta.hot) {
      import.meta.hot.on("theme-css-update", async () => {
        await this.reloadStylesheet();
      });
    }

    this.store.watch(
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
    const rawThemeId = themeParams.get("themeId");
    const themeId =
      isValidManifestId(rawThemeId)
        ? rawThemeId
        : "default";
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

    try {
      await this.loadStylesheet(`theme://${themeId}/style.css`);
    } catch (e) {
      log.error(e);
      if (themeId !== "default") {
        await this.apply("default", dark);
      }
    }
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

    try {
      await this.loadStylesheet(`${href.split("?")[0]}?t=${Date.now()}`);
    } catch (e) {
      log.warn(e);
    }
  }
}
