import {
  parseIni,
  convertKeybinding,
  checkConfigWarnings,
  BkConfigProvider,
} from "@/common/bkConfig/BkConfigProvider";
import _ from "lodash";

describe("Config", () => {
  it("should parse ini file correctly", () => {
    const parsed = parseIni(`
[general]
maxResults = 10

[ui.general]
save = ctrlOrCmd+s
    `);

    const expected = {
      general: {
        maxResults: 10,
      },
      ui: {
        general: {
          save: "ctrlOrCmd+s",
        },
      },
    };

    expect(parsed).toMatchObject(expected);
  });

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

  it("should check for unrecognized config keys", () => {
    const defaultConfig = parseIni(`
[general]
maxResults = 10

[ui.general]
save = ctrlOrCmd+s
    `);

    const userConfig = parseIni(`
[general]
maxResults = 20
minResults = 10

[ui.general]
save = ctrlOrCmd+s
load = ctrlOrCmd+o

[ui.personal]
superiorkey = ctrlOrCmd+c

[generall]
minRes = 10
    `);

    const warnings = checkConfigWarnings(defaultConfig, userConfig);
    const expectedWarnings = [
      {
        type: "key",
        section: "general",
        key: "minResults",
        value: 10,
      },
      {
        type: "section",
        section: "generall",
      },
      {
        type: "key",
        section: "ui.general",
        key: "load",
        value: "ctrlOrCmd+o",
      },
      {
        type: "section",
        section: "ui.personal",
      },
    ];

    expect(warnings).toEqual(expectedWarnings);
  });

  it("should initialize config", () => {
    expect(BkConfigProvider.initialize()).resolves.toBeTruthy()
  })
});
