import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { ThemeSystemError } from "@/lib/errors";
import type { ThemeSnapshot } from "@/services/plugin/types";
import { ThemeModule, type ThemeModuleOptions } from "./ThemeModule";

export class ThemeLicenseModule extends ThemeModule {
  constructor(options: ThemeModuleOptions) {
    super(options);

    this.hook("before-install-theme", this.guardInstall);
    this.hook("theme-snapshots", this.applyLicense);
  }

  private async guardInstall(_themeId: string): Promise<void> {
    const license = await LicenseKey.getLicenseStatus();

    if (license.isUltimate) {
      return;
    }

    throw new ThemeSystemError(
      "LICENSE_REQUIRED",
      "Installing themes requires a valid license"
    );
  }

  private async applyLicense(snapshots: ThemeSnapshot[]): Promise<ThemeSnapshot[]> {
    const license = await LicenseKey.getLicenseStatus();

    if (license.isUltimate) {
      return snapshots;
    }

    return snapshots.map((snapshot) => {
      if (snapshot.disableState.disabled || snapshot.origin === "bundled") {
        return snapshot;
      }

      return {
        ...snapshot,
        disableState: { disabled: true, reason: "license-required" },
      };
    });
  }
}
