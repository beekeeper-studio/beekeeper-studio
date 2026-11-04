import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const cache = vi.hoisted(() => new Map<string, string>());

vi.mock("@/common/appdb/models/ThemeEntryCache", () => ({
  ThemeEntryCache: class {
    id: string;
    origin: string;
    withProps(props: any) {
      Object.assign(this, props);
      return this;
    }
    async save() {
      cache.set(this.id, this.origin);
    }
    static async find() {
      return [...cache].map(([id, origin]) => ({ id, origin }));
    }
    static async delete({ id }: { id: string }) {
      cache.delete(id);
    }
  },
}));

vi.mock("@/services/extensions/ExtensionRegistry", () => ({ default: class {} }));

import { ThemeManager } from "@/services/theme/ThemeManager";
import ExtensionFileManager from "@/services/extensions/ExtensionFileManager";

const config = (themeSystem = {}) => ({
  themeSystem: {
    communityDisabled: false,
    unlistedDisabled: true,
    ...themeSystem,
  },
}) as any;

const entry = { id: "tokyo", origin: "community" };

describe("ThemeManager", () => {
  let root: string;
  let registry: any;
  let manager: ThemeManager;

  function addTheme(id: string, { style = true } = {}) {
    fs.mkdirSync(path.join(root, id), { recursive: true });
    fs.writeFileSync(
      path.join(root, id, "manifest.json"),
      JSON.stringify({ id, name: `Name ${id}`, version: "1.0.0" })
    );
    if (style) {
      fs.writeFileSync(path.join(root, id, "style.css"), "");
    }
  }

  const stateOf = async (id: string) =>
    (await manager.getThemes()).filter((t) => t.manifest.id === id);

  beforeEach(() => {
    cache.clear();
    root = fs.mkdtempSync(path.join(os.tmpdir(), "bks-themes-"));
    registry = {
      initialize: vi.fn(),
      clearCache: vi.fn(),
      getEntries: vi.fn(async () => ({ "community-themes": [entry] })),
      findEntry: vi.fn(async () => entry),
      getRepository: vi.fn(),
      reloadRepository: vi.fn(),
      errors: {},
    };
    manager = new ThemeManager({
      fileManager: new ExtensionFileManager({ root }),
      config: config(),
      registry,
    });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("keeps an installed community theme enabled when the registry is unreachable", async () => {
    addTheme("tokyo");
    await manager.syncOrigins();

    registry.getEntries.mockResolvedValue({ "community-themes": [] });
    registry.errors = { "community-themes": "offline" };
    const { errors } = await manager.getEntries(true);
    const [theme] = await stateOf("tokyo");

    expect(errors).toEqual(["offline"]);
    expect(theme.origin).toBe("community");
    expect(theme.disableState.disabled).toBe(false);
  });

  it("does not touch the registry when listing themes", async () => {
    addTheme("tokyo");
    await manager.getThemes();
    expect(registry.getEntries).not.toHaveBeenCalled();
    expect(registry.findEntry).not.toHaveBeenCalled();
  });

  it("forgets the origin on uninstall, so a hand-placed copy is unlisted", async () => {
    await manager.initialize();
    addTheme("tokyo");
    await manager.syncOrigins();
    await manager.uninstallTheme("tokyo");
    addTheme("tokyo");
    expect((await stateOf("tokyo"))[0].origin).toBe("unlisted");
  });

  it("disables a theme without style.css", async () => {
    manager.options.config.themeSystem.unlistedDisabled = false;
    addTheme("no-style", { style: false });
    expect((await stateOf("no-style"))[0].disableState).toEqual({
      disabled: true,
      reason: "missing-style",
    });
  });

  it("keeps the bundled theme first and marks a clashing user theme", async () => {
    addTheme("dracula");
    const [bundled, user] = await stateOf("dracula");
    expect(bundled.origin).toBe("bundled");
    expect(bundled.disableState.disabled).toBe(false);
    expect(user.disableState).toEqual({ disabled: true, reason: "bundled-id-conflict" });
  });

  it("refuses to install a registry theme with a bundled id", async () => {
    await manager.initialize();
    await expect(manager.installTheme("dracula")).rejects.toThrow(/reserved/);
    expect(registry.getRepository).not.toHaveBeenCalled();
  });

  it("reports updates by comparing versions, not just inequality", async () => {
    await manager.initialize();
    addTheme("tokyo");
    registry.reloadRepository.mockResolvedValue({ latestRelease: { manifest: { version: "1.1.0" } } });
    expect(await manager.checkForUpdates("tokyo")).toBe(true);
    registry.reloadRepository.mockResolvedValue({ latestRelease: { manifest: { version: "0.9.0" } } });
    expect(await manager.checkForUpdates("tokyo")).toBe(false);
  });
});
