import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, Wrapper } from "@vue/test-utils";

const notys = vi.hoisted(() => [] as any[]);

vi.mock("noty", () => {
  class FakeNoty {
    static button = (text: string, _classes: string, cb: () => void) => ({ text, cb });
    static closeAll = () => notys.forEach((n) => n.close());
    options: Record<string, any>;
    shown = false;
    closed = false;
    constructor(options: Record<string, any>) {
      this.options = { ...options };
      notys.push(this);
    }
    // Like the real Noty: close() leaves `shown` set, so a closed instance
    // can't be shown again
    show() {
      if (this.shown) return this;
      this.shown = true;
      return this;
    }
    close() {
      this.closed = true;
      return this;
    }
    get visible() {
      return this.shown && !this.closed;
    }
  }
  return { default: FakeNoty };
});

import AutoUpdater from "@/components/AutoUpdater.vue";

const noticesWith = (text: string) => notys.filter((n) => n.options.text.includes(text));
const noticeWith = (text: string) => noticesWith(text).at(-1);
const click = (notice: any, label: string) =>
  notice.options.buttons.find((b) => b.text === label).cb();

describe("AutoUpdater", () => {
  let handlers: Record<string, (...args: any[]) => void>;
  let main: Record<string, any>;
  let $noty: { info: ReturnType<typeof vi.fn> };
  let wrapper: Wrapper<any>;

  beforeEach(() => {
    notys.length = 0;
    handlers = {};
    main = {
      onUpdateEvent: (event: string, fn: (...args: any[]) => void) => { handlers[event] = fn },
      updaterReady: vi.fn(),
      triggerDownload: vi.fn(),
      triggerInstall: vi.fn(),
      openExternally: vi.fn(),
    };
    (window as any).main = main;
    $noty = { info: vi.fn() };
    wrapper = mount(AutoUpdater, { mocks: { $noty } });
  });

  afterEach(() => {
    wrapper.destroy();
  });

  describe("regular installs", () => {
    it("downloads the update from the notice", () => {
      handlers["update-available"]();
      const notice = noticeWith("Download now?");
      expect(notice.visible).toBe(true);

      click(notice, "Download");

      expect(main.triggerDownload).toHaveBeenCalledTimes(1);
      expect(notice.visible).toBe(false);
      expect($noty.info).toHaveBeenCalled();
    });

    it("shows the notice again after Not now", () => {
      handlers["update-available"]();
      click(noticeWith("Download now?"), "Not now");
      expect(noticeWith("Download now?").visible).toBe(false);

      // e.g. Help > Check for Software Updates
      handlers["update-available"]();

      expect(noticeWith("Download now?").visible).toBe(true);
    });

    it("installs a downloaded update", () => {
      handlers["update-downloaded"]();
      const notice = noticeWith("Restart Beekeeper Studio to install");

      click(notice, "Restart Now");

      expect(main.triggerInstall).toHaveBeenCalledTimes(1);
    });

    it("asks again to restart after Later", () => {
      handlers["update-downloaded"]();
      click(noticeWith("Restart Beekeeper Studio to install"), "Later");

      handlers["update-downloaded"]();

      expect(noticeWith("Restart Beekeeper Studio to install").visible).toBe(true);
    });
  });

  describe("portable", () => {
    it("links to the website", () => {
      handlers["manual-update"]();

      click(noticeWith("Download from our website"), "Download");

      expect(main.openExternally).toHaveBeenCalledWith("https://beekeeperstudio.io/get");
    });
  });

  describe("MSI installs", () => {
    it("tells users which version to ask their administrator for", () => {
      handlers["managed-update"]({}, "6.2.0");

      const notice = noticeWith("system administrator");
      expect(notice.visible).toBe(true);
      expect(notice.options.text).toBe(
        "Beekeeper Studio 6.2.0 is available. Contact your system administrator to install it."
      );
    });

    it("offers nothing to download", () => {
      handlers["managed-update"]({}, "6.2.0");

      expect(noticeWith("system administrator").options.buttons.map((b) => b.text)).toEqual(["OK"]);
      expect(notys.filter((n) => n.visible)).toHaveLength(1);
    });

    it("shows the notice again after it was dismissed", () => {
      handlers["managed-update"]({}, "6.2.0");
      click(noticeWith("system administrator"), "OK");
      expect(noticeWith("system administrator").visible).toBe(false);

      handlers["managed-update"]({}, "6.2.0");

      expect(noticeWith("system administrator").visible).toBe(true);
      expect(noticesWith("system administrator")).toHaveLength(2);
    });

    it("leaves the version out when it isn't a plain version string", () => {
      handlers["managed-update"]({}, '<img src=x onerror="alert(1)">');

      expect(noticeWith("system administrator").options.text).toBe(
        "A new version of Beekeeper Studio is available. Contact your system administrator to install it."
      );
    });
  });

  it("only shows one update notice at a time", () => {
    handlers["update-available"]();
    handlers["update-downloaded"]();

    expect(notys.filter((n) => n.visible).map((n) => n.options.text)).toEqual([
      "Update downloaded. Restart Beekeeper Studio to install",
    ]);
  });
});
