import {
  convertKeybinding,
  BksConfigProvider,
} from "@/common/bksConfig/BksConfigProvider";
import { parseIni } from "../../src/config/helpers";
import _ from "lodash";
import { checkConflicts, checkUnrecognized } from "@/common/bksConfig/mainBksConfig";

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

  it("should detect unrecognized config keys", () => {
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

    const warnings = checkUnrecognized(defaultConfig, userConfig, "user");
    const expectedWarnings = [
      {
        sourceName: "user",
        type: "unrecognized-key",
        section: "general",
        path: "general.minResults",
      },
      {
        sourceName: "user",
        type: "unrecognized-key",
        section: "generall",
        path: "generall",
      },
      {
        sourceName: "user",
        type: "unrecognized-key",
        section: "ui.general",
        path: "ui.general.load",
      },
      {
        sourceName: "user",
        type: "unrecognized-key",
        section: "ui.personal",
        path: "ui.personal",
      },
    ];

    expect(warnings).toEqual(expectedWarnings);
  });

  it("should detect conflicts between user and system keys", () => {
    const systemConfig = parseIni(`
[general]
checkForUpdatesInterval = 86400000      ; 24 hours
maxResults = 100

[keybindings.queryEditor]
submitAllQuery = ctrlOrCmd+enter

[ui.tableTable]
pageSize = 100
    `);

    const userConfig = parseIni(`
[general]
maxResults = 200

[keybindings.queryEditor]
submitAllQuery = ctrlOrCmd+shift+enter

[ui.tableTable] ; empty section should not cause a warning
    `);

    const warnings = checkConflicts(userConfig, systemConfig, "user");
    const expectedWarnings = [
      {
        type: "system-user-conflict",
        sourceName: "user",
        section: "general",
        path: "general.maxResults",
      },
      {
        type: "system-user-conflict",
        sourceName: "user",
        section: "keybindings.queryEditor",
        path: "keybindings.queryEditor.submitAllQuery",
      },
    ];
  });
});
