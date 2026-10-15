import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, Wrapper } from "@vue/test-utils";

const notys = vi.hoisted(() => [] as any[]);

vi.mock("noty", () => {
  class FakeNoty {
    static button = (text: string, _classes: string, cb: () => void) => ({ text, cb });
    static closeAll = () => notys.forEach((n) => (n.shown = false));
    options: Record<string, any>;
    shown = false;
    constructor(options: Record<string, any>) {
      this.options = { ...options };
      notys.push(this);
    }
    setText(text: string, optionsOverride = false) {
      if (optionsOverride) this.options.text = text;
      return this;
    }
    show() {
      this.shown = true;
      return this;
    }
    close() {
      this.shown = false;
      return this;
    }
  }
  return { default: FakeNoty };
});

import AutoUpdater from "@/components/AutoUpdater.vue";

const managedNoty = () => notys.find((n) => n.options.text.includes("system administrator"));

describe("AutoUpdater", () => {
  let handlers: Record<string, (...args: any[]) => void>;
  let wrapper: Wrapper<any>;

  beforeEach(() => {
    notys.length = 0;
    handlers = {};
    (window as any).main = {
      onUpdateEvent: (event: string, fn: (...args: any[]) => void) => { handlers[event] = fn },
      updaterReady: vi.fn(),
    };
    wrapper = mount(AutoUpdater);
  });

  afterEach(() => {
    wrapper.destroy();
  });

  it("tells MSI users which version to ask their administrator for", () => {
    handlers["managed-update"]({}, "6.2.0");

    const noty = managedNoty();
    expect(noty.shown).toBe(true);
    expect(noty.options.text).toBe(
      "Beekeeper Studio 6.2.0 is available. Contact your system administrator to install it."
    );
  });

  it("offers nothing to download", () => {
    handlers["managed-update"]({}, "6.2.0");

    expect(managedNoty().options.buttons.map((b) => b.text)).toEqual(["OK"]);
    expect(notys.filter((n) => n.shown)).toHaveLength(1);
  });

  it("leaves the version out when it isn't a plain version string", () => {
    handlers["managed-update"]({}, '<img src=x onerror="alert(1)">');

    expect(managedNoty().options.text).toBe(
      "A new version of Beekeeper Studio is available. Contact your system administrator to install it."
    );
  });
});
