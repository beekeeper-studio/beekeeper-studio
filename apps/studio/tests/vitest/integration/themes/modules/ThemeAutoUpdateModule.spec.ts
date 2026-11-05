import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
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
import { ThemeAutoUpdateModule } from "@/services/theme/modules/ThemeAutoUpdateModule";
import { createConfig } from "@tests/vitest/integration/utils/config";
import globals from "@/common/globals";

describe("Theme Auto Update Module", () => {
  const server = createThemeServer();
  const repositoryService = new MockThemeRepositoryService(server);

  let registry: ExtensionRegistry;
  let fileManager: ExtensionFileManager<ThemeManifest>;

  function createThemeManager() {
    return new ThemeManager({ fileManager, registry });
  }

  async function versionOf(manager: ThemeManager, id: string) {
    const theme = (await manager.getThemes()).find(
      (t) => t.manifest.id === id
    );
    return theme.manifest.version;
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
    registry = new ExtensionRegistry({
      repositoryService,
      registries: globals.themes.registries,
    });
    fileManager = createFileManager();
  });

  afterEach(() => {
    cleanFileManager(fileManager);
  });

  it("can update themes automatically on start", async () => {
    const manager = createThemeManager();
    await manager.initialize();
    await manager.installTheme("test-theme");
    await manager.installTheme("frozen-banana");

    // Simulate theme updates on the server
    repositoryService.themes[0].latestRelease.version = "1.2.0";
    repositoryService.themes[1].latestRelease.version = "1.3.0";

    // Simulate app restart
    const manager2 = createThemeManager();
    manager2.registerModule(
      ThemeAutoUpdateModule.with({ config: createConfig() })
    );
    await manager2.initialize();

    expect(await versionOf(manager2, "test-theme")).toBe("1.2.0");
    expect(await versionOf(manager2, "frozen-banana")).toBe("1.3.0");
  });

  it("does not update themes when auto update is off", async () => {
    const manager = createThemeManager();
    await manager.initialize();
    await manager.installTheme("test-theme");

    // Simulate theme update on the server
    repositoryService.themes[0].latestRelease.version = "1.2.0";

    // Simulate app restart
    const manager2 = createThemeManager();
    const config = createConfig(`
      [themeSystem]
      autoUpdate = false
    `);
    manager2.registerModule(ThemeAutoUpdateModule.with({ config }));
    await manager2.initialize();

    expect(await versionOf(manager2, "test-theme")).toBe("1.0.0");
  });
});
