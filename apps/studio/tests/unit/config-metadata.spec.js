import {
  BksConfigProvider,
} from "@/common/bksConfig/BksConfigProvider";
import { ConfigMetadataProvider } from "@/common/bksConfig/ConfigMetadataProvider";
import { parseIni, processRawConfig } from "@/config/helpers";
import testConfigIni from "../fixtures/bksConfig/config.ini";
import testMetadata from "../fixtures/bksConfig/config-metadata.json";
import fullConfigIni from "../../default.config.ini";
import fullMetadata from "../../config-metadata.json";

/** @type {import("@/common/IPlatformInfo").IPlatformInfo} */
const linuxPlatformInfo = {
  isMac: false,
  isWindows: false,
  isLinux: true,
  platform: "linux",
  isDevelopment: false,
  env: {
    development: false,
    test: true,
    production: false,
  },
};

const macPlatformInfo = {
  ...linuxPlatformInfo,
  isMac: true,
  isWindows: false,
  isLinux: false,
  platform: "mac",
};

describe("Config Metadata", () => {
  it("should generate all keybindings for UI", () => {
    const raw = parseIni(testConfigIni);
    const processed = processRawConfig(raw);
    const source = {
      defaultConfig: processed,
      systemConfig: {},
      userConfig: {},
      warnings: [],
    };
    const linuxConfig = BksConfigProvider.create(source, linuxPlatformInfo);
    const linuxConfigUI = new ConfigMetadataProvider({
      bksConfig: linuxConfig,
      metadata: testMetadata,
      platformInfo: linuxPlatformInfo,
    });
    expect(linuxConfigUI.getKeybindingSections()).toStrictEqual([
      {
        sectionKey: "keybindings.general",
        label: "General",
        actions: [
          {
            key: "refresh",
            label: "Refresh",
            keybindings: [["F5"], ["Ctrl", "R"]],
          },
        ],
      },
      {
        sectionKey: "keybindings.tab",
        label: "Tabs",
        actions: [
          {
            key: "closeTab",
            label: "Close Tab",
            keybindings: [["Ctrl", "W"]],
          },
          {
            key: "switchTab1",
            label: "Switch to Tab 1",
            keybindings: [["Alt", "1"]],
          },
        ],
      },
      {
        sectionKey: "keybindings.plugins.bks-ai-shell",
        label: "plugins.bks-ai-shell",
        actions: [
          {
            key: "new-tab-dropdown-item",
            label: "new-tab-dropdown-item",
            keybindings: [["Ctrl", "L"]],
          },
        ],
      },
    ]);

    const macConfig = BksConfigProvider.create(source, macPlatformInfo);
    const macConfigUI = new ConfigMetadataProvider({
      bksConfig: macConfig,
      metadata: testMetadata,
      platformInfo: macPlatformInfo,
    });
    const tabSection = macConfigUI
      .getKeybindingSections()
      .find((k) => k.sectionKey === "keybindings.tab");
    expect(tabSection.actions).toStrictEqual([
      {
        key: "closeTab",
        label: "Close Tab",
        keybindings: [["⌘", "W"]],
      },
      {
        key: "switchTab1",
        label: "Switch to Tab 1",
        keybindings: [["⌥", "1"]],
      },
    ]);
  });

  // NOTE: This could be used to test all configs metadata instead of just keybindings
  it("should have labels defined for all keybindings", () => {
    const raw = parseIni(fullConfigIni);
    const processed = processRawConfig(raw);
    const source = {
      defaultConfig: processed,
      systemConfig: {},
      userConfig: {},
      warnings: [],
    };
    const bksConfig = BksConfigProvider.create(source, linuxPlatformInfo);
    const bksConfigUI = new ConfigMetadataProvider({
      bksConfig,
      metadata: fullMetadata,
      platformInfo: linuxPlatformInfo,
    });
    expect(() => bksConfigUI.getKeybindingSections()).not.toThrow();
  });
});
