import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { isVersionLessThanOrEqual, parseVersion } from "@/common/version";
import _ from "lodash";
import platformInfo from "@/common/platform_info";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";

const ANY_VERSION = "1.0.0";
const ANY_VERSION_TAG = "v1.0.0";
const EARLY_VERSION_TAG = "v0.9.0";

function v(strings: TemplateStringsArray) {
  const [major, minor, patch] = strings[0].split(".");
  return {
    major: parseInt(major),
    minor: parseInt(minor),
    patch: parseInt(patch),
  };
}

function expectStatus() {
  return expect(
    LicenseKey.getLicenseStatus().then((s) => _.omit(s, ["license"]))
  ).resolves;
}

async function createLicense(options: {
  validUntil: string;
  supportUntil?: string;
  maxAllowedAppRelease: Nullable<{ tagName: string }>;
}) {
  await LicenseKey.delete({});
  const license = new LicenseKey();
  license.validUntil = new Date(options.validUntil);
  license.supportUntil = new Date(options.supportUntil ?? options.validUntil);
  license.licenseType = "PersonalLicense";
  license.email = "fake-email";
  license.key = "fake-key";
  license.maxAllowedAppRelease = options.maxAllowedAppRelease;
  return await license.save();
}

function currentTime(date: string) {
  jest.useFakeTimers({ now: new Date(date).getTime() });
}

function currentVersion(version: string) {
  const [major, minor, patch] = version.split(".");
  platformInfo.parsedAppVersion = {
    major: parseInt(major),
    minor: parseInt(minor),
    patch: parseInt(patch),
  };
}

describe("License", () => {
  it("parse version correctly", () => {
    expect(parseVersion("1.0.2")).toEqual({ major: 1, minor: 0, patch: 2 });
    expect(parseVersion("10.12.11")).toEqual({
      major: 10,
      minor: 12,
      patch: 11,
    });
  });

  it("isVersionLessThanOrEqual", () => {
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.2.1`, v`1.2.3`)).toBe(true);
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.0.0`)).toBe(false);
    expect(isVersionLessThanOrEqual(v`1.3.2`, v`1.2.3`)).toBe(false);
  });

  describe("License status", () => {
    const origParsedAppVersion = platformInfo.parsedAppVersion;

    beforeEach(async () => {
      await TestOrmConnection.connect();
    });

    afterEach(async () => {
      jest.useRealTimers();
      await TestOrmConnection.disconnect();
      platformInfo.parsedAppVersion = origParsedAppVersion;
    });

    it("Community - No license found", async () => {
      expectStatus().toEqual({
        edition: "community",
        condition: ["No license found"],
      });
    });

    it("Community - License expired", async () => {
      currentTime("18-Sep-2024");
      currentVersion(ANY_VERSION);

      await createLicense({
        validUntil: "17-Sep-2024",
        supportUntil: "17-Sep-2024",
        maxAllowedAppRelease: { tagName: ANY_VERSION_TAG },
      });
      expectStatus().toEqual({
        edition: "community",
        condition: ["Expired support date", "Expired valid date"],
      });
    });

    it("Ultimate - No app version restriction", async () => {
      currentTime("16-Sep-2024");
      currentVersion(ANY_VERSION);
      await createLicense({
        validUntil: "17-Sep-2024",
        maxAllowedAppRelease: null,
      });
      expectStatus().toEqual({
        edition: "ultimate",
        condition: ["No app version restriction"],
      });
    });

    it("Ultimate - App version allowed", async () => {
      currentTime("16-Sep-2024");
      currentVersion("1.0.1");
      await createLicense({
        validUntil: "17-Sep-2024",
        maxAllowedAppRelease: { tagName: "v1.0.1" },
      });
      await expectStatus().toEqual({
        edition: "ultimate",
        condition: ["App version allowed"],
      });

      currentVersion("1.0.0");
      expectStatus().toEqual({
        edition: "ultimate",
        condition: ["App version allowed"],
      });
    });

    it("Ultimate - Lifetime license, App version allowed, license expired", async () => {
      currentTime("18-Sep-2024");
      currentVersion(ANY_VERSION);
      await createLicense({
        validUntil: "18-Sep-2024",
        supportUntil: "17-Sep-2024",
        maxAllowedAppRelease: { tagName: ANY_VERSION_TAG },
      });
      expectStatus().toEqual({
        edition: "ultimate",
        condition: ["Expired support date", "App version allowed"],
      });
    })

    it("Community - Lifetime license, App version not allowed, license expired", async () => {
      currentTime("18-Sep-2024");
      currentVersion(ANY_VERSION);
      await createLicense({
        validUntil: "18-Sep-2024",
        supportUntil: "17-Sep-2024",
        maxAllowedAppRelease: { tagName: EARLY_VERSION_TAG },
      });
      expectStatus().toEqual({
        edition: "community",
        condition: ["Expired support date", "App version not allowed"],
      });
    })
  });
});
