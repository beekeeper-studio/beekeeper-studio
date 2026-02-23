import { convertKeybinding } from "@/common/bksConfig/BksConfigProvider";
import { parseIni, resolveKeybindingQualifiers } from "@/config/helpers";
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

  describe("Qualifier", () => {
    it("should override base key when platform qualifier matches", () => {
      const config = parseIni(`
[keybindings.general]
redo = ctrlOrCmd+shift+z
redo(windows) = ctrl+y
      `);

      resolveKeybindingQualifiers(config, "windows");

      expect(config.keybindings.general.redo).toBe("ctrl+y");
      expect(config.keybindings.general).not.toHaveProperty("redo(windows)");
    });

    it("should keep base key when platform qualifier does not match", () => {
      const config = parseIni(`
[keybindings.general]
redo = ctrlOrCmd+shift+z
redo(windows) = ctrl+y
      `);

      resolveKeybindingQualifiers(config, "mac");

      expect(config.keybindings.general.redo).toBe("ctrlOrCmd+shift+z");
      expect(config.keybindings.general).not.toHaveProperty("redo(windows)");
    });

    it("should handle platform-only keys with no base key", () => {
      const macConfig = parseIni(`
[keybindings.general]
quit(mac) = cmd+q
      `);
      const windowsConfig = _.cloneDeep(macConfig);

      resolveKeybindingQualifiers(macConfig, "mac");
      resolveKeybindingQualifiers(windowsConfig, "windows");

      expect(macConfig.keybindings.general).toHaveProperty("quit");
      expect(windowsConfig.keybindings.general).not.toHaveProperty("quit");
    });
  });
});
