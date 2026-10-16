import { describe, it, expect } from "vitest";
import { arm64BuildDownloadUrl, shouldOfferArm64Build } from "@/common/arm64BuildNotice";

const x64OnArm = { isWindows: true, runningUnderArm64Translation: true, isPortable: "", isMsi: false };

describe("arm64BuildNotice", () => {
  it("offers the ARM64 build to the x64 Windows build running on an ARM PC", () => {
    expect(shouldOfferArm64Build(x64OnArm, false)).toBe(true);
  });

  it("stays quiet once dismissed", () => {
    expect(shouldOfferArm64Build(x64OnArm, true)).toBe(false);
  });

  it("stays quiet when not emulated, including the native ARM64 build", () => {
    expect(shouldOfferArm64Build({ ...x64OnArm, runningUnderArm64Translation: false }, false)).toBe(false);
  });

  it("stays quiet for MSI installs, which IT manages", () => {
    expect(shouldOfferArm64Build({ ...x64OnArm, isMsi: true }, false)).toBe(false);
  });

  it("stays quiet under Rosetta on macOS", () => {
    expect(shouldOfferArm64Build({ ...x64OnArm, isWindows: false }, false)).toBe(false);
  });

  it("links the installer, or the portable exe for portable users", () => {
    expect(arm64BuildDownloadUrl(x64OnArm)).toBe(
      "https://www.beekeeperstudio.io/download/?ext=exe&arch=arm64&type=installer"
    );
    expect(arm64BuildDownloadUrl({ ...x64OnArm, isPortable: "C:\\Tools\\Beekeeper" })).toBe(
      "https://www.beekeeperstudio.io/download/?ext=exe&arch=arm64&type=portable"
    );
  });
});
