export class StylesheetLoader {
  private el: HTMLLinkElement;
  private computed: CSSStyleDeclaration;

  constructor(selector: string) {
    this.el = document.querySelector(selector);

    if (!this.el) {
      throw new Error(`No stylesheet link matching ${selector}`);
    }

    this.computed = getComputedStyle(document.body);
  }

  async load(href: string): Promise<void> {
    const loaded = this.el.getAttribute("href") === href && this.el.sheet;

    if (!loaded) {
      await new Promise<void>((resolve, reject) => {
        const done = (handler: () => void) => () => {
          this.el.removeEventListener("load", onLoad);
          this.el.removeEventListener("error", onError);
          handler();
        };

        const onLoad = done(resolve);
        const onError = done(() =>
          reject(new Error(`Failed to load stylesheet ${href}`))
        );

        this.el.addEventListener("load", onLoad);
        this.el.addEventListener("error", onError);

        this.el.href = href;
      });
    }

    this.computed = getComputedStyle(document.body);
  }

  /** Re-fetch the current stylesheet, bypassing the cache. */
  async reload(): Promise<void> {
    const href = this.el.getAttribute("href");

    if (!href) {
      return;
    }

    await this.load(`${href.split("?")[0]}?t=${Date.now()}`);
  }

  get(property: string): string {
    return this.computed.getPropertyValue(property).trim();
  }
}
