import { convertKeybinding } from "@/common/bksConfig/BksConfigProvider";
import { parseIni } from "@/config/helpers";
import { parseTags } from "@/config/tags";
import _ from "lodash";

describe("Configuration (keybindings)", () => {
  it("should convert keybinding syntax correctly", () => {
    expect(convertKeybinding("electron", "ctrlOrCmd+shift+c", "mac")).toBe(
      "CommandOrControl+Shift+C"
    );

    expect(convertKeybinding("v-hotkey", "ctrlOrCmd+shift+c", "mac")).toBe(
      "meta+shift+c"
    );
    expect(convertKeybinding("v-hotkey", "ctrlOrCmd+shift+c", "linux")).toBe(
      "ctrl+shift+c"
    );
    expect(convertKeybinding("v-hotkey", "CtrlOrCmd+Shift+C", "linux")).toBe(
      "ctrl+shift+c"
    );
    expect(convertKeybinding("v-hotkey", "CTRLORCMD+SHIFT+C", "linux")).toBe(
      "ctrl+shift+c"
    );
    expect(
      convertKeybinding("v-hotkey", "CTRLORCMD   +  SHIFT  + C", "linux")
    ).toBe("ctrl+shift+c");
  });

  describe("Platform tags", () => {
    it("should recognize tags", () => {
      const config: any = parseIni(`
[test]
keys[] = a, mac: b
keys[] = c, mac: d, win: e
keys[] = linux: f, mac: g, win: h
keys[] = mac: i
keys[] = mac: j, linux: k
keys[] = linux: l, m
keys[] = n
      `);

      parseTags(config);

      expect(config.test.keys).toStrictEqual([
        { default: "a", mac: "b", $$type: "taggedString" },
        { default: "c", mac: "d", win: "e", $$type: "taggedString" },
        { linux: "f", mac: "g", win: "h", $$type: "taggedString" },
        { mac: "i", $$type: "taggedString" },
        { mac: "j", linux: "k", $$type: "taggedString" },
        { linux: "l", default: "m", $$type: "taggedString" },
        "n",
      ]);
    });

    //     it("should keep base key when platform qualifier does not match", () => {
    //       const config = parseIni(`
    // [keybindings.general]
    // redo = ctrlOrCmd+shift+z
    // redo(windows) = ctrl+y
    //       `);
    //
    //       applyPlatformTags(config, "mac");
    //
    //       expect(config.keybindings.general.redo).toBe("ctrlOrCmd+shift+z");
    //       expect(config.keybindings.general).not.toHaveProperty("redo(windows)");
    //     });
    //
    //     it("should handle platform-only keys with no base key", () => {
    //       const macConfig = parseIni(`
    // [keybindings.general]
    // quit(mac) = cmd+q
    //       `);
    //       const windowsConfig = _.cloneDeep(macConfig);
    //
    //       applyPlatformTags(macConfig, "mac");
    //       applyPlatformTags(windowsConfig, "windows");
    //
    //       expect(macConfig.keybindings.general).toHaveProperty("quit");
    //       expect(windowsConfig.keybindings.general).not.toHaveProperty("quit");
    //     });
  });
});
