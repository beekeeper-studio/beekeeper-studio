import { describe, it, expect } from "vitest";
import DriverDepManager from "@/services/driverDeps/DriverDepManager";
import DriverDepRegistry from "@/services/driverDeps/DriverDepRegistry";
import type DriverDepFileManager from "@/services/driverDeps/DriverDepFileManager";
import type { DepArch, DepPlatform, DriverDepProvider } from "@/services/driverDeps/types";

const provider: DriverDepProvider = {
  requirement: {
    id: "test-client",
    name: "Test Client",
    settingKey: "testClient",
    required: false,
  },
  connectionTypes: ["oracle"],
  async resolve() {
    return {
      requirementId: "test-client",
      version: "1.0.0",
      artifacts: [
        { platform: "windows", arch: "x64", url: "https://example.com/win-x64.zip", fileName: "win-x64.zip" },
        { platform: "linux", arch: "x64", url: "https://example.com/linux-x64.zip", fileName: "linux-x64.zip" },
      ],
      licenseName: "Test License",
      licenseUrl: "https://example.com/license",
      documentationUrl: "https://example.com/docs",
    };
  },
};

async function managerFor(platform: DepPlatform, arch: DepArch) {
  const registry = new DriverDepRegistry();
  registry.register(provider);
  const fileManager = { scanInstalled: () => [] } as unknown as DriverDepFileManager;
  const manager = new DriverDepManager({ fileManager, registry, platform, arch });
  await manager.initialize();
  return manager;
}

describe("DriverDepManager", () => {
  it("offers a download when the provider has an artifact for this platform and arch", async () => {
    const manager = await managerFor("windows", "x64");
    const status = await manager.getStatus("test-client");
    expect(status.providerAvailable).toBe(true);
  });

  it("offers no download when the provider has no artifact for this arch", async () => {
    // e.g. Oracle Instant Client on Windows ARM64
    const manager = await managerFor("windows", "arm64");
    const status = await manager.getStatus("test-client");
    expect(status.providerAvailable).toBe(false);
  });

  it("refuses to install without an artifact for this platform and arch", async () => {
    const manager = await managerFor("windows", "arm64");
    await expect(manager.install("test-client")).rejects.toThrow(
      'No artifact available for windows/arm64 in "test-client"'
    );
  });
});
