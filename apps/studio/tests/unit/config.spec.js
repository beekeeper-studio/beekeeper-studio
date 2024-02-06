import { convertKeybinding } from "../../src/lib/config/config-helper";

describe("Config", () => {
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
});
