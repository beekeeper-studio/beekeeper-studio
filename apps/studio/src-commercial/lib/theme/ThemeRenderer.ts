import { Store } from "vuex";
import { State } from "@/store/index";
import { AppEvent } from "@/common/AppEvent";
import { StylesheetLoader } from "./StylesheetLoader";
import { ColorGenerator } from "./ColorGenerator";

type ThemeId = "default" | "solarized" | "dracula" | "github";

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
  private themeId: ThemeId | null = null;
  private dark: boolean | null = null;
  private stylesheet: StylesheetLoader | null = null;
  private style: HTMLStyleElement | null = null;

  private media = window.matchMedia("(prefers-color-scheme: dark)");

  constructor(readonly options: ThemeRendererOptions) { }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const { themeId, dark } = this.parseThemeParams();

    this.stylesheet = new StylesheetLoader("link#theme");

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
        await this.stylesheet.reload();
        this.renderPalette(this.dark);
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
    themeId: ThemeId,
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

  private async apply(themeId: ThemeId, dark: boolean): Promise<void> {
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

    await this.stylesheet.load(`/themes/${themeId}.css`);

    this.renderPalette(dark);
  }

  private renderPalette(dark: boolean): void {
    const background = this.stylesheet.get("--background");
    const gray = this.stylesheet.get("--base-gray");
    const red = this.stylesheet.get("--base-red");
    const orange = this.stylesheet.get("--base-orange");
    const yellow = this.stylesheet.get("--base-yellow");
    const green = this.stylesheet.get("--base-green");
    const blue = this.stylesheet.get("--base-blue");
    const purple = this.stylesheet.get("--base-purple");
    const pink = this.stylesheet.get("--base-pink");
    const accent = this.stylesheet.get("--base-accent");

    const palette = new ColorGenerator({ gray, background });

    let css = palette.generateGrayCss(gray, dark);

    if (red) {
      css += palette.generateCss("red", red, dark);
    }
    if (orange) {
      css += palette.generateCss("orange", orange, dark);
    }
    if (yellow) {
      css += palette.generateCss("yellow", yellow, dark);
    }
    if (green) {
      css += palette.generateCss("green", green, dark);
    }
    if (blue) {
      css += palette.generateCss("blue", blue, dark);
    }
    if (purple) {
      css += palette.generateCss("purple", purple, dark);
    }
    if (pink) {
      css += palette.generateCss("pink", pink, dark);
    }
    if (accent) {
      css += palette.generateCss("primary", accent, dark);
    }

    this.style?.remove();
    this.style = document.createElement("style");
    this.style.textContent = `body { ${css}} }`;
    document.head.insertBefore(this.style, document.querySelector("link#theme"));
  }
}
