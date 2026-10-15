import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import _ from "lodash";
import {
  BksConfigProvider,
  BksConfigSource,
  offlineModeSettings,
} from "@/common/bksConfig/BksConfigProvider";
import { parseIni, processRawConfig } from "@/config/helpers";
import { IPlatformInfo } from "@/common/IPlatformInfo";

const defaultConfigIni = readFileSync(
  path.resolve(__dirname, "../../../../../default.config.ini"),
  "utf-8"
);
const defaultConfig = processRawConfig(parseIni(defaultConfigIni)) as unknown as IBksConfig;

const platformInfo = { isDevelopment: false, platform: "linux" } as IPlatformInfo;

function build(
  systemIni = "",
  userIni = ""
) {
  const source: BksConfigSource = {
    defaultConfig,
    systemConfig: processRawConfig(parseIni(systemIni)),
    userConfig: processRawConfig(parseIni(userIni)),
    warnings: [],
  };
  return BksConfigProvider.create(source, platformInfo);
}

describe("offline mode", () => {
  it("lists only settings that exist in default.config.ini", () => {
    for (const setting of offlineModeSettings) {
      expect(_.get(defaultConfig, setting), setting).toBe(false);
    }
  });

  it("documents every forced setting in default.config.ini", () => {
    const documented = defaultConfigIni
      .split("offlineMode = false")[0]
      .split("\n")
      .map((line) => line.match(/^;\s+([\w.-]+\.[\w-]+)$/)?.[1])
      .filter(Boolean);
    expect(documented.sort()).toEqual([...offlineModeSettings].sort());
  });

  it("is off by default and leaves online features on", () => {
    const config = build();
    expect(config.general.offlineMode).toBe(false);
    for (const setting of offlineModeSettings) {
      expect(config.get(setting), setting).toBe(false);
      expect(_.get(config, setting), setting).toBe(false);
    }
  });

  it("forces every online feature off when set in the system config", () => {
    const config = build("[general]\nofflineMode = true\n");
    for (const setting of offlineModeSettings) {
      expect(config.get(setting), setting).toBe(true);
      expect(_.get(config, setting), setting).toBe(true);
      expect(_.get(config.getAll(), setting), setting).toBe(true);
    }
  });

  it("can be turned on from the user config", () => {
    const config = build("", "[general]\nofflineMode = true\n");
    expect(config.cloud.workspacesDisabled).toBe(true);
  });

  it("cannot be undone by re-enabling a feature in a config file", () => {
    const config = build(
      "[general]\nofflineMode = true\n",
      "[cloud]\nworkspacesDisabled = false\n[general]\ncheckForUpdatesDisabled = false\n"
    );
    expect(config.cloud.workspacesDisabled).toBe(true);
    expect(config.general.checkForUpdatesDisabled).toBe(true);
    expect(config.debug("cloud.workspacesDisabled").config.name).toBe("offline");
  });

  it("cannot be turned off by the user when the system config turns it on", () => {
    const config = build("[general]\nofflineMode = true\n", "[general]\nofflineMode = false\n");
    expect(config.general.offlineMode).toBe(true);
    expect(config.cloud.workspacesDisabled).toBe(true);
  });

  it("lets each feature be turned off on its own without offline mode", () => {
    const config = build("[cloud]\nworkspacesDisabled = true\n");
    expect(config.general.offlineMode).toBe(false);
    expect(config.cloud.workspacesDisabled).toBe(true);
    expect(config.general.checkForUpdatesDisabled).toBe(false);
  });

  it("leaves unrelated settings alone", () => {
    const config = build("[general]\nofflineMode = true\n");
    expect(config.general.checkForUpdatesInterval).toBe(defaultConfig.general.checkForUpdatesInterval);
    expect(config.ui.tableTable.pageSize).toBe(defaultConfig.ui.tableTable.pageSize);
  });
});
