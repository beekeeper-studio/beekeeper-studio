import { describe, it, expect, vi, beforeEach } from "vitest";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import type PluginManager from "@/services/plugin/PluginManager";
import { ConfigurationModule } from "@commercial/backend/plugin-system/modules/ConfigurationModule";
import { PluginSystemError } from "@/lib/errors";
import { PluginSnapshot } from "@/services/plugin";
import { BksConfigProvider } from "@/common/bksConfig/BksConfigProvider";
import { IPlatformInfo } from "@/common/IPlatformInfo";
import { parseIni, processRawConfig } from "@/config/helpers";
import defaultConfigIni from "../../../../../default.config.ini";

function createConfig(userIni: string) {
  const trimmed = userIni.split("\n").map((line) => line.trimStart()).join("\n");
  return BksConfigProvider.create(
    {
      defaultConfig: processRawConfig(parseIni(defaultConfigIni)) as unknown as IBksConfig,
      systemConfig: {},
      userConfig: processRawConfig(parseIni(trimmed)),
      warnings: [],
    },
    { isDevelopment: false, platform: "linux" } as IPlatformInfo
  );
}

function fakeRepositoryService() {
  return {
    fetchOfficial: vi.fn().mockResolvedValue([{ id: "official-plugin", repo: "o/official" }]),
    fetchCommunity: vi.fn().mockResolvedValue([{ id: "community-plugin", repo: "c/community" }]),
    fetchPluginRepository: vi.fn(),
  };
}

function build(ini: string) {
  const repositoryService = fakeRepositoryService();
  const registry = new PluginRegistry(repositoryService as unknown as PluginRepositoryService);
  const manager = { registry } as unknown as PluginManager;
  const module = new (ConfigurationModule.with({ config: createConfig(ini) }))({ manager });
  const hook = (name: string) => module.hooks.find((h) => h.name === name).handler as any;
  return { repositoryService, registry, hook };
}

function snapshot(id: string): PluginSnapshot {
  return {
    manifest: { id },
    origin: "official",
    disableState: { disabled: false },
  } as unknown as PluginSnapshot;
}

describe("ConfigurationModule pluginSystem.registryDisabled", () => {
  const enabledPluginSystem = `
    [pluginSystem]
    disabled = false
    communityDisabled = false
  `;

  let built: ReturnType<typeof build>;

  describe("when turned off", () => {
    beforeEach(() => {
      built = build(enabledPluginSystem);
    });

    it("fetches the registry", async () => {
      await built.registry.getEntries();
      expect(built.repositoryService.fetchOfficial).toHaveBeenCalled();
      expect(built.repositoryService.fetchCommunity).toHaveBeenCalled();
    });
  });

  describe("when turned on", () => {
    beforeEach(() => {
      built = build(`${enabledPluginSystem}\nregistryDisabled = true`);
    });

    it("never fetches the plugin lists", async () => {
      await expect(built.registry.getEntries()).resolves.toStrictEqual({
        official: [],
        community: [],
      });
      expect(built.repositoryService.fetchOfficial).not.toHaveBeenCalled();
      expect(built.repositoryService.fetchCommunity).not.toHaveBeenCalled();
    });

    it("never fetches a plugin's release info (update checks)", async () => {
      await expect(built.registry.reloadRepository("official-plugin")).rejects.toMatchObject({
        code: "PLUGIN_NOT_FOUND",
      });
      expect(built.repositoryService.fetchPluginRepository).not.toHaveBeenCalled();
    });

    it("blocks installs", () => {
      const beforeInstall = built.hook("before-install-plugin");
      expect(() => beforeInstall("official-plugin")).toThrow(PluginSystemError);
      expect(() => beforeInstall("official-plugin")).toThrow(/registryDisabled/);
    });

    it("keeps installed plugins enabled", () => {
      const applyConfig = built.hook("plugin-snapshots");
      const [result] = applyConfig([snapshot("official-plugin")]);
      expect(result.disableState.disabled).toBe(false);
    });
  });

  it("is turned on by offline mode", async () => {
    built = build(`${enabledPluginSystem}\n[general]\nofflineMode = true`);
    await built.registry.getEntries();
    expect(built.repositoryService.fetchOfficial).not.toHaveBeenCalled();
    expect(built.repositoryService.fetchCommunity).not.toHaveBeenCalled();
  });
});
