import {
  convertKeybinding,
  BksConfigProvider,
} from "@/common/bksConfig/BksConfigProvider";
import { parseIni, processRawConfig } from "@/config/helpers";
import _ from "lodash";
import { checkConflicts, checkUnrecognized, checkDeprecations } from "@/common/bksConfig/mainBksConfig";

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
    expect(convertKeybinding("v-hotkey", "delete", "mac")).toBe("backspace");
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

    const warnings = checkUnrecognized(defaultConfig, userConfig, {}, "user");
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

  it("should recognize plugin configurations", () => {
    const defaultConfig = parseIni(``);
    const userConfig = parseIni(`
[plugins.bks-ai-shell]
enabled = true
    `);

    const warnings = checkUnrecognized(defaultConfig, userConfig, {}, "user");
    expect(warnings).toEqual([]);
  })

  it("should not flag array properties as unrecognized", () => {
    const defaultConfig = parseIni(`
[pluginSystem]
allow[] =
    `);

    const userConfig = parseIni(`
[pluginSystem]
allow[] = "bks-er-diagram"
    `);

    const warnings = checkUnrecognized(defaultConfig, userConfig, {}, "user");
    expect(warnings).toEqual([]);
  });

  it("should not flag array properties with multiple values as unrecognized", () => {
    const defaultConfig = parseIni(`
[pluginSystem]
allow[] =
    `);

    const userConfig = parseIni(`
[pluginSystem]
allow[] = "bks-er-diagram"
allow[] = "bks-ai-shell"
    `);

    const warnings = checkUnrecognized(defaultConfig, userConfig, {}, "user");
    expect(warnings).toEqual([]);
  });

  it("should not flag deprecated keys as unrecognized", () => {
    const defaultConfig = parseIni(`
[general]
maxResults = 10
    `);

    const deprecatedConfig = parseIni(`
[general]
oldSetting = 'Replaced by maxResults'

[legacy]
removedOption = 'No longer supported'
    `);

    const userConfig = parseIni(`
[general]
maxResults = 20
oldSetting = 5

[legacy]
removedOption = true
    `);

    const warnings = checkUnrecognized(defaultConfig, userConfig, deprecatedConfig, "user");
    expect(warnings).toEqual([]);
  });

  it("should flag truly unrecognized keys even when deprecated config is provided", () => {
    const defaultConfig = parseIni(`
[general]
maxResults = 10
    `);

    const deprecatedConfig = parseIni(`
[general]
oldSetting = 'Replaced by maxResults'
    `);

    const userConfig = parseIni(`
[general]
maxResults = 20
oldSetting = 5
unknownKey = true
    `);

    const warnings = checkUnrecognized(defaultConfig, userConfig, deprecatedConfig, "user");
    expect(warnings).toEqual([
      {
        sourceName: "user",
        type: "unrecognized-key",
        section: "general",
        path: "general.unknownKey",
      },
    ]);
  });

  it("should detect deprecated keys used in config", () => {
    const deprecatedConfig = parseIni(`
[keybindings.queryEditor]
submitTabQuery = 'Replaced by primaryQueryAction'
submitCurrentQuery = 'Replaced by secondaryQueryAction'
    `);

    const userConfig = parseIni(`
[keybindings.queryEditor]
submitTabQuery = ctrlOrCmd+enter
    `);

    const warnings = checkDeprecations(userConfig, deprecatedConfig, "user");
    expect(warnings).toEqual([
      {
        type: "deprecated-key",
        sourceName: "user",
        section: "keybindings.queryEditor",
        path: "keybindings.queryEditor.submitTabQuery",
        value: "Replaced by primaryQueryAction",
      },
    ]);
  });

  it("should not flag non-deprecated keys as deprecated", () => {
    const deprecatedConfig = parseIni(`
[keybindings.queryEditor]
submitTabQuery = 'Replaced by primaryQueryAction'
    `);

    const userConfig = parseIni(`
[keybindings.queryEditor]
primaryQueryAction = ctrlOrCmd+enter
    `);

    const warnings = checkDeprecations(userConfig, deprecatedConfig, "user");
    expect(warnings).toEqual([]);
  });

  it("should detect multiple deprecated keys across sections", () => {
    const deprecatedConfig = parseIni(`
[keybindings.queryEditor]
submitTabQuery = 'Replaced by primaryQueryAction'
submitCurrentQuery = 'Replaced by secondaryQueryAction'

[general]
oldOption = 'Use newOption instead'
    `);

    const userConfig = parseIni(`
[keybindings.queryEditor]
submitTabQuery = ctrlOrCmd+enter
submitCurrentQuery = ctrlOrCmd+shift+enter

[general]
oldOption = true
    `);

    const warnings = checkDeprecations(userConfig, deprecatedConfig, "user");
    expect(warnings).toEqual([
      {
        type: "deprecated-key",
        sourceName: "user",
        section: "general",
        path: "general.oldOption",
        value: "Use newOption instead",
      },
      {
        type: "deprecated-key",
        sourceName: "user",
        section: "keybindings.queryEditor",
        path: "keybindings.queryEditor.submitTabQuery",
        value: "Replaced by primaryQueryAction",
      },
      {
        type: "deprecated-key",
        sourceName: "user",
        section: "keybindings.queryEditor",
        path: "keybindings.queryEditor.submitCurrentQuery",
        value: "Replaced by secondaryQueryAction",
      },
    ]);
  });

  it("should detect deprecated keys for system source", () => {
    const deprecatedConfig = parseIni(`
[general]
oldOption = 'Use newOption instead'
    `);

    const systemConfig = parseIni(`
[general]
oldOption = 42
    `);

    const warnings = checkDeprecations(systemConfig, deprecatedConfig, "system");
    expect(warnings).toEqual([
      {
        type: "deprecated-key",
        sourceName: "system",
        section: "general",
        path: "general.oldOption",
        value: "Use newOption instead",
      },
    ]);
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

  it("should detect conflicts for array properties between user and system keys", () => {
    const systemConfig = parseIni(`
[pluginSystem]
allow[] = "bks-er-diagram"
    `);

    const userConfig = parseIni(`
[pluginSystem]
allow[] = "bks-ai-shell"
    `);

    const warnings = checkConflicts(userConfig, systemConfig, "user");
    expect(warnings).toEqual([
      {
        type: "system-user-conflict",
        sourceName: "user",
        section: "pluginSystem",
        path: "pluginSystem.allow",
      },
    ]);
  });

  it("Should create defaults for [db.default] for all connection types", () => {
    const rawConfig = parseIni(`
[db.default]
initialSort = false
    `);

    const processedConfig = processRawConfig(rawConfig);

    const expected = {
      db: {
        default: {
          initialSort: false
        },
        sqlite: {
          initialSort: false
        },
        sqlserver: {
          initialSort: false
        },
        redshift: {
          initialSort: false
        },
        cockroachdb: {
          initialSort: false
        },
        mysql: {
          initialSort: false
        },
        postgres: {
          initialSort: false
        },
        mariadb: {
          initialSort: false
        },
        cassandra: {
          initialSort: false
        },
        oracle: {
          initialSort: false
        },
        bigquery: {
          initialSort: false
        },
        firebird: {
          initialSort: false
        },
        tidb: {
          initialSort: false
        },
        libsql: {
          initialSort: false
        },
        clickhouse: {
          initialSort: false
        },
        duckdb: {
          initialSort: false
        },
        mongodb: {
          initialSort: false
        },
        sqlanywhere: {
          initialSort: false
        },
      }
    };

    expect(processedConfig).toMatchObject(expected);
  })

  it("Should properly parse param types from config", () => {
    const rawConfig = parseIni(`
[db.default.paramTypes]
positional = true
named[] =
numbered[] =
quoted[] =

[db.postgres.paramTypes]
positional = false
numbered[] = '$'

[db.bigquery.paramTypes]
positional = true
named[] = '@'
quoted[] = '@'
    `)

    const processedConfig = processRawConfig(rawConfig);

    const expected = {

      db: {
        default: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        sqlite: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        sqlserver: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        redshift: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        cockroachdb: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        mysql: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        postgres: {
          paramTypes: {
            positional: false,
            named: [],
            numbered: [ '$' ],
            quoted: [],
          }
        },
        mariadb: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        cassandra: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        oracle: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        bigquery: {
          paramTypes: {
            positional: true,
            named: [ '@' ],
            numbered: [],
            quoted: [ '@' ],
          }
        },
        firebird: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        tidb: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        libsql: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        clickhouse: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        duckdb: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        mongodb: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
        sqlanywhere: {
          paramTypes: {
            positional: true,
            named: [],
            numbered: [],
            quoted: [],
          }
        },
      }
    };

    expect(processedConfig).toMatchObject(expected);
  })
});
