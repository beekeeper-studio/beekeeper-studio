import { menuItems } from "@/common/menus/MenuItems";
import { IMenuActionHandler } from "@/common/interfaces/IMenuActionHandler";
import { IGroupedUserSettings } from "@/common/transport/TransportUserSetting";
import { IPlatformInfo } from "@/common/IPlatformInfo";

// menuItems only dereferences handler properties, so a permissive proxy is
// enough to build the full template.
const actionHandler = new Proxy({} as IMenuActionHandler, {
  get: () => jest.fn(),
});

const settings = {} as IGroupedUserSettings;

function buildItems(platform: Partial<IPlatformInfo>) {
  return menuItems(actionHandler, settings, platform as IPlatformInfo);
}

describe("menuItems", () => {
  // Regression test for #4491: the focused editor (CodeMirror, text inputs)
  // already handles these shortcuts. If the accelerator is also registered,
  // NewAppMenu binds it via v-hotkey and each keypress fires an extra
  // webContents call, e.g. Ctrl+Z undoing 2-3 steps at once.
  const editorScopedItems = ["undo", "redo", "cut", "copy", "paste"];

  it.each(editorScopedItems)(
    "does not register the accelerator for %s",
    (id) => {
      const items = buildItems({ isMac: false, isWindows: true });
      expect(items[id].registerAccelerator).toBe(false);
    }
  );

  it.each(editorScopedItems)(
    "keeps the %s menu item clickable with a visible shortcut",
    (id) => {
      const items = buildItems({ isMac: false, isWindows: true });
      expect(items[id].accelerator).toBeTruthy();
      expect(typeof items[id].click).toBe("function");
    }
  );

  it("keeps undo/redo bound to their native roles", () => {
    const items = buildItems({ isMac: true });
    expect(items.undo.role).toBe("undo");
    expect(items.redo.role).toBe("redo");
  });
});
