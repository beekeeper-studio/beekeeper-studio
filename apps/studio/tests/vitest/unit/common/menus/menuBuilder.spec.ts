import { describe, it, expect, vi } from "vitest";
import MenuBuilder from "@/common/menus/MenuBuilder";
import { IMenuActionHandler } from "@/common/interfaces/IMenuActionHandler";
import { IGroupedUserSettings } from "@/common/transport/TransportUserSetting";
import { IPlatformInfo } from "@/common/IPlatformInfo";

const actionHandler = new Proxy({} as IMenuActionHandler, {
  get: () => vi.fn(),
});

function helpMenuIds(platform: Partial<IPlatformInfo>) {
  const builder = new MenuBuilder(
    {} as IGroupedUserSettings,
    actionHandler,
    platform as IPlatformInfo,
    {} as IBksConfig
  );
  const submenu = builder.helpMenu().submenu as Electron.MenuItemConstructorOptions[];
  return submenu.map((item) => item.id).filter(Boolean);
}

describe("MenuBuilder help menu", () => {
  const windows = { isWindows: true, isMac: false, isLinux: false };

  it("offers update checks and the release channel on Windows", () => {
    const ids = helpMenuIds({ ...windows, isMsi: false });
    expect(ids).toContain("updatecheck");
    expect(ids).toContain("toggle-beta");
  });

  it("keeps update checks but hides the release channel for MSI installs", () => {
    const ids = helpMenuIds({ ...windows, isMsi: true });
    expect(ids).toContain("updatecheck");
    expect(ids).not.toContain("toggle-beta");
  });
});
