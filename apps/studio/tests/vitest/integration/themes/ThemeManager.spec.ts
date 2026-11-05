import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import globals from "@/common/globals";
import fs from "fs";
import path from "path";
import ExtensionFileManager from "@/services/extension/ExtensionFileManager";
import { ThemeManager } from "@/services/theme/ThemeManager";
import { createThemeServer } from "./utils/server";
import { createFileManager, cleanFileManager } from "./utils/extensionFileManager";
import { MockThemeRepositoryService } from "./utils/registry";
import { PluginSystemError, ThemeSystemError } from "@/lib/errors";
import ExtensionRegistry from "@/services/extension/ExtensionRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { ThemeManifest, ThemeSnapshot } from "@/services/plugin";

describe("Basic Theme Management", () => {
  const server = createThemeServer();
  const repositoryService = new MockThemeRepositoryService(server);
  const registry = new ExtensionRegistry({
    repositoryService,
    registries: globals.themes.registries,
  });

  let fileManager: ExtensionFileManager<ThemeManifest>;

  async function initThemeManager() {
    const manager = new ThemeManager({ fileManager, registry });
    await manager.initialize();
    return manager;
  }

  /** Place a theme in the themes directory by hand, like an unlisted theme. */
  function placeTheme(id: string, { style = true } = {}) {
    const directory = path.join(fileManager.options.root, id);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "manifest.json"),
      JSON.stringify({ id, name: `Name ${id}`, version: "1.0.0" })
    );
    if (style) {
      fs.writeFileSync(path.join(directory, "style.css"), "");
    }
  }

  function installedThemes(themes: ThemeSnapshot[]) {
    return themes.filter((theme) => theme.origin !== "bundled");
  }

  beforeAll(async () => {
    await TestOrmConnection.connect();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    repositoryService.themes = [
      {
        id: "test-theme",
        name: "Test Theme",
        latestRelease: { version: "1.0.0" },
        readme: "# Test Theme\n\nThis is a test theme.",
        origin: "community",
      },
      {
        id: "frozen-banana",
        name: "Frozen Banana",
        latestRelease: { version: "1.0.0" },
        readme: "# Frozen Banana\n\nThis is a frozen banana.",
        origin: "community",
      },
    ];
    registry.clearCache();
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Discovery", () => {
    it("can list theme entries", async () => {
      const manager = await initThemeManager();
      const entries = await manager.registry.getEntries();
      expect(entries["community-themes"].map((e) => e.id)).toStrictEqual([
        "test-theme",
        "frozen-banana",
      ]);
    });
  });

  describe("Installing", () => {
    it("can install the latest themes", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");
      const themes = installedThemes(await manager.getThemes());
      expect(themes).toHaveLength(1);
      expect(themes[0]).toMatchObject({
        manifest: { id: "test-theme", version: "1.0.0" },
        origin: "community",
        disableState: { disabled: false },
      });
    });

    it("can not install nonexistent themes", async () => {
      const manager = await initThemeManager();
      const promise = manager.installTheme("microwave-pizza");
      await expect(promise).rejects.toBeInstanceOf(PluginSystemError);
      await expect(promise).rejects.toHaveProperty("code", "PLUGIN_NOT_FOUND");
    });

    it("can not install a theme with a bundled id", async () => {
      const manager = await initThemeManager();
      const promise = manager.installTheme("dracula");
      await expect(promise).rejects.toBeInstanceOf(ThemeSystemError);
      await expect(promise).rejects.toHaveProperty("code", "THEME_ID_RESERVED");
    });
  });

  describe("Loading", () => {
    it("lists the bundled themes first", async () => {
      const manager = await initThemeManager();
      const themes = await manager.getThemes();
      expect(themes.map((theme) => theme.manifest.id)).toStrictEqual(
        globals.themes.bundled.map((theme) => theme.id)
      );
      expect(themes.every((theme) => theme.origin === "bundled")).toBe(true);
    });

    it("ignores an installed theme whose id clashes with a bundled one", async () => {
      placeTheme("dracula");
      const manager = await initThemeManager();
      const themes = (await manager.getThemes()).filter(
        (theme) => theme.manifest.id === "dracula"
      );
      expect(themes).toHaveLength(1);
      expect(themes[0].origin).toBe("bundled");
    });

    it("marks a theme placed by hand as unlisted", async () => {
      placeTheme("hand-made");
      const manager = await initThemeManager();
      const [theme] = installedThemes(await manager.getThemes());
      expect(theme.origin).toBe("unlisted");
    });

    it("keeps the origin of a theme removed from the registry", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");

      // Simulate the theme being taken down from the registry
      repositoryService.themes = repositoryService.themes.filter(
        (theme) => theme.id !== "test-theme"
      );
      registry.clearCache();

      // Simulate app restart
      const manager2 = await initThemeManager();
      const [theme] = installedThemes(await manager2.getThemes());
      expect(theme.origin).toBe("community");
    });

    it("disables a theme without style.css", async () => {
      placeTheme("no-style", { style: false });
      const manager = await initThemeManager();
      const [theme] = installedThemes(await manager.getThemes());
      expect(theme.disableState).toStrictEqual({
        disabled: true,
        reason: "missing-style",
      });
    });
  });

  describe("Updating", () => {
    it("can check for updates", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");

      // The theme is already up to date
      expect(await manager.checkForUpdates("test-theme")).toBe(false);

      // Simulate theme update on the server
      repositoryService.themes[0].latestRelease.version = "1.2.0";

      // The theme is now outdated
      expect(await manager.checkForUpdates("test-theme")).toBe(true);
    });

    it("does not report an older release as an update", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");

      // Simulate a lower version on the server
      repositoryService.themes[0].latestRelease.version = "0.9.0";

      expect(await manager.checkForUpdates("test-theme")).toBe(false);
    });

    it("can update themes manually", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");

      // Simulate theme update on the server
      repositoryService.themes[0].latestRelease.version = "1.2.0";

      await manager.updateTheme("test-theme");
      const [theme] = installedThemes(await manager.getThemes());
      expect(theme.manifest.version).toBe("1.2.0");
    });

    it("can not update nonexistent themes", async () => {
      const manager = await initThemeManager();
      const promise = manager.updateTheme("microwave-pizza");
      await expect(promise).rejects.toBeInstanceOf(PluginSystemError);
      await expect(promise).rejects.toHaveProperty("code", "PLUGIN_NOT_FOUND");
    });
  });

  describe("Uninstalling", () => {
    it("can uninstall themes", async () => {
      const manager = await initThemeManager();
      await manager.installTheme("test-theme");
      await manager.uninstallTheme("test-theme");
      expect(installedThemes(await manager.getThemes())).toHaveLength(0);
    });
  });
});
