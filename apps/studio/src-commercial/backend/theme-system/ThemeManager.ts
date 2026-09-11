export interface ThemeManagerOptions {
  initialThemeId: string;
  initialThemeDark: boolean;
}

export class ThemeManager {
  private el: HTMLLinkElement | null = null;
  private themeId: string;
  private dark: boolean;
  private initialized = false;

  constructor(readonly options: ThemeManagerOptions) {
    this.themeId = options.initialThemeId;
    this.dark = options.initialThemeDark;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.apply();
    this.initialized = true;
  }

  setId(themeId: string): void {
    if (themeId === this.themeId) {
      return;
    }
    this.themeId = themeId;
    this.apply();
  }

  setDark(dark: boolean): void {
    if (dark === this.dark) {
      return;
    }
    this.dark = dark;
    this.apply();
  }

  private apply(): void {
    // Themes have to sit on the same element as :root, or a theme's palette
    // lands too late to feed the semantic vars that are resolved there.
    const { classList } = document.body;

    [...classList].forEach((name) => {
      if (name.startsWith("theme-")) {
        classList.remove(name);
      }
    });

    classList.add(`theme-${this.themeId}`);
    classList.toggle("dark-theme", this.dark);
    classList.toggle("light-theme", !this.dark);

    this.el?.remove();
    this.el = null;

    if (this.themeId === "default") {
      // The default theme is the base layer, and it ships in the app bundle.
      return;
    }

    const el = document.createElement("link");
    el.setAttribute("rel", "stylesheet");
    // FIXME sanitize
    el.setAttribute("href", `app://themes/${this.themeId}.css`);
    document.head.appendChild(el);
    this.el = el;
  }
}
