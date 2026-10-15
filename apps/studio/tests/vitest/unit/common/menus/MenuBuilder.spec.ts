import { describe, it, expect, vi } from "vitest";
import MenuBuilder from "@/common/menus/MenuBuilder";
import { IMenuActionHandler } from "@/common/interfaces/IMenuActionHandler";
import { IGroupedUserSettings } from "@/common/transport/TransportUserSetting";
import { IPlatformInfo } from "@/common/IPlatformInfo";

const actionHandler = new Proxy({} as IMenuActionHandler, {
  get: () => vi.fn(),
});

const settings = { useBeta: { value: false } } as unknown as IGroupedUserSettings;

function menuIds(platform: Partial<IPlatformInfo>, checkForUpdatesDisabled: boolean) {
  const bksConfig = {
    general: { checkForUpdatesDisabled },
    security: { lockMode: "disabled" },
  } as unknown as IBksConfig;
  const builder = new MenuBuilder(settings, actionHandler, platform as IPlatformInfo, bksConfig);
  const ids: string[] = [];
  const walk = (items: any[]) => items.forEach((item) => {
    if (item.id) ids.push(item.id);
    if (Array.isArray(item.submenu)) walk(item.submenu);
  });
  walk(builder.buildTemplate());
  return ids;
}

const platforms: [string, Partial<IPlatformInfo>][] = [
  ["mac", { isMac: true }],
  ["windows", { isWindows: true }],
  ["linux AppImage", { isLinux: true, isAppImage: true }],
];

describe("MenuBuilder update items", () => {
  it.each(platforms)("shows update checks and the release channel on %s", (_name, platform) => {
    const ids = menuIds(platform, false);
    expect(ids).toContain("updatecheck");
    expect(ids).toContain("toggle-beta");
  });

  it.each(platforms)("hides them on %s when update checks are disabled", (_name, platform) => {
    const ids = menuIds(platform, true);
    expect(ids).not.toContain("updatecheck");
    expect(ids).not.toContain("toggle-beta");
  });
});
