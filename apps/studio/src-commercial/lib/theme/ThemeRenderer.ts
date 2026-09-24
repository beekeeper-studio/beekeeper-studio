import { Store } from "vuex";
import { State } from "@/store/index";
import { AppEvent } from "@/common/AppEvent";
import { generatePaletteAsCssProps } from "@/lib/theme/palette";
import defaultTheme from "@/assets/styles/themes/default/manifest.json";
import solarizedTheme from "@/assets/styles/themes/solarized/manifest.json";
import draculaTheme from "@/assets/styles/themes/dracula/manifest.json";
import githubTheme from "@/assets/styles/themes/github/manifest.json";

interface ThemeManifest {
  id: string;
  name: string;
  base: {
    background: string;
    gray: string;
    blue: string;
    green: string;
    orange: string;
    red: string;
    purple: string;
    pink: string;
    yellow: string;
  };
  baseDark?: {
    /** @default uses base color. */
    background?: string;
    /** @default uses base color. */
    gray?: string;
    /** @default uses base color. */
    blue?: string;
    /** @default uses base color. */
    green?: string;
    /** @default uses base color. */
    orange?: string;
    /** @default uses base color. */
    purple?: string;
    /** @default uses base color. */
    pink?: string;
    /** @default uses base color. */
    yellow?: string;
  };
  functional?: {
    /** @default yellow */
    accent?: "gray" | "blue" | "green" | "orange" | "red" | "purple" | "pink";
  };
  /** Primary buttons use the gray scale instead of the primary hue. */
  primaryButtonsUseGray?: boolean;
}

type ThemeId = "default" | "solarized" | "dracula" | "github";

const manifests: Record<ThemeId, ThemeManifest> = {
  default: defaultTheme as ThemeManifest,
  solarized: solarizedTheme as ThemeManifest,
  dracula: draculaTheme as ThemeManifest,
  github: githubTheme as ThemeManifest,
};

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
  private el: HTMLStyleElement | null = null;

  constructor(readonly options: ThemeRendererOptions) { }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const { themeId, dark, systemDark } = this.parseThemeParams();

    this.el = document.createElement("style");
    document.head.appendChild(this.el);

    this.apply(themeId, dark);

    document.body.classList.toggle("window-inactive", !document.hasFocus());

    this.options.store.commit("theme/setSystemDark", systemDark);

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
  }

  private parseThemeParams() {
    const themeParams = new URLSearchParams(window.location.search);
    const themeId = themeParams.get("themeId") ?? "default";
    const appearance = themeParams.get("appearance") ?? "auto";
    const systemDark = themeParams.get("systemDark") === "true";
    const dark = appearance === "auto" ? systemDark : appearance === "dark";
    return { themeId, dark, systemDark };
  }

  private apply(themeId: ThemeId, dark: boolean): void {
    document.body.classList.forEach((className) => {
      if (className.startsWith("theme-")) {
        document.body.classList.remove(className);
      }
    });

    document.body.classList.add(`theme-${themeId}`);
    document.body.classList.toggle("dark-theme", dark);
    document.body.classList.toggle("light-theme", !dark);

    this.applyScales(themeId, dark);
  }

  private applyScales(themeId: ThemeId, dark: boolean): void {
    const manifest = manifests[themeId];

    if (!manifest) {
      this.el.textContent = "";
      return;
    }

    const base = {
      ...manifest.base,
      ...(dark ? manifest.baseDark : {}),
    };

    let content = `body { --app-bg: ${base.background}; `;

    for (const [name, color] of Object.entries(base)) {
      content += `--${name}: ${color}; `;
    }

    for (const color of [
      "gray",
      "blue",
      "green",
      "orange",
      "red",
      "purple",
      "pink",
      "yellow",
    ] as const) {
      const str = generatePaletteAsCssProps(color, {
        dark,
        accent: base[color],
        gray: base.gray,
        background: base.background,
      });
      content += str;
    }

    const accent = manifest.functional?.accent;
    if (accent) {
      for (let step = 1; step <= 12; step++) {
        content += `--primary-${step}: var(--${accent}-${step}); `;
        content += `--primary-a${step}: var(--${accent}-a${step}); `;
      }
      content += `--primary-solid-fg: var(--${accent}-fg); `;
      content += `--primary-solid-fg-hover: var(--${accent}-fg); `;
    }

    if (manifest.primaryButtonsUseGray) {
      content += dark
        ? `--btn-primary-fg: var(--gray-2); --btn-primary-fg-hover: var(--gray-2); --btn-primary-bg: var(--white); --btn-primary-bg-hover: var(--gray-12); `
        : `--btn-primary-fg: var(--gray-3); --btn-primary-fg-hover: var(--gray-3); --btn-primary-bg: var(--black); --btn-primary-bg-hover: var(--gray-12); `;
    }

    content += ` }`;

    this.el.textContent = content;
  }
}
