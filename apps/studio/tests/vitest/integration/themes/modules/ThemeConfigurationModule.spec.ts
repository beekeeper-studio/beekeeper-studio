import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import ExtensionFileManager from "@/services/extension/ExtensionFileManager";
import { ThemeManifest } from "@/services/plugin/types";
import { ThemeManager } from "@/services/theme/ThemeManager";
import { createThemeServer } from "@tests/vitest/integration/themes/utils/server";
import {
  createFileManager,
  cleanFileManager,
} from "@tests/vitest/integration/themes/utils/extensionFileManager";
import { MockThemeRepositoryService } from "@tests/vitest/integration/themes/utils/registry";
import ExtensionRegistry from "@/services/extension/ExtensionRegistry";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { ThemeConfigurationModule } from "@/services/theme/modules/ThemeConfigurationModule";
import { createConfig } from "@tests/vitest/integration/utils/config";
import globals from "@/common/globals";

describe("Theme Configuration Module", () => {
  const server = createThemeServer();
  const repositoryService = new MockThemeRepositoryService(server);
  repositoryService.themes = [
    {
      id: "community-theme",
      name: "Community Theme",
      latestRelease: { version: "1.0.0" },
      readme: "# Community Theme\n\nThis is a community theme.",
      origin: "community",
    },
  ];

  let registry: ExtensionRegistry;
  let fileManager: ExtensionFileManager<ThemeManifest>;

  function createThemeManager() {
    return new ThemeManager({ fileManager, registry });
  }

  /** Place a theme in the themes directory by hand, like an unlisted theme. */
  function placeTheme(id: string) {
    const directory = path.join(fileManager.options.root, id);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, "manifest.json"),
      JSON.stringify({ id, name: `Name ${id}`, version: "1.0.0" })
    );
    fs.writeFileSync(path.join(directory, "style.css"), "");
  }

  beforeAll(async () => {
    await TestOrmConnection.connect();
  });

  afterAll(async () => {
    await TestOrmConnection.disconnect();
  });

  beforeEach(async () => {
    registry = new ExtensionRegistry({
      repositoryService,
      registries: globals.themes.registries,
    });
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  describe("Disable community themes", () => {
    const config = createConfig(`
      [themeSystem]
      communityDisabled = true
    `);

    it("can disable installed community themes", async () => {
      const manager = createThemeManager();
      await manager.initialize();
      await manager.installTheme("community-theme");

      const manager2 = createThemeManager();
      manager2.registerModule(ThemeConfigurationModule.with({ config }));
      await manager2.initialize();

      const theme = (await manager2.getThemes()).find(
        (t) => t.manifest.id === "community-theme"
      );
      expect(theme.disableState).toStrictEqual({
        disabled: true,
        reason: "community-themes-disabled",
      });
    });

    it("does not disable bundled themes", async () => {
      const manager = createThemeManager();
      manager.registerModule(ThemeConfigurationModule.with({ config }));
      await manager.initialize();

      const bundled = (await manager.getThemes()).filter(
        (t) => t.origin === "bundled"
      );
      expect(bundled.every((t) => !t.disableState.disabled)).toBe(true);
    });
  });

  describe("Disable unlisted themes", () => {
    it("disables unlisted themes by default", async () => {
      placeTheme("hand-made");
      const manager = createThemeManager();
      manager.registerModule(
        ThemeConfigurationModule.with({ config: createConfig() })
      );
      await manager.initialize();

      const theme = (await manager.getThemes()).find(
        (t) => t.manifest.id === "hand-made"
      );
      expect(theme.disableState).toStrictEqual({
        disabled: true,
        reason: "unlisted-theme-disabled",
      });
    });

    it("can enable unlisted themes", async () => {
      placeTheme("hand-made");
      const manager = createThemeManager();
      const config = createConfig(`
        [themeSystem]
        unlistedDisabled = false
      `);
      manager.registerModule(ThemeConfigurationModule.with({ config }));
      await manager.initialize();

      const theme = (await manager.getThemes()).find(
        (t) => t.manifest.id === "hand-made"
      );
      expect(theme.disableState).toStrictEqual({ disabled: false });
    });
  });
});
