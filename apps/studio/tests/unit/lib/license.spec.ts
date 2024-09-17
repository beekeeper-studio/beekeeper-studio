import { TransportLicenseKey } from "@/common/transport";
import { getLicenseStatus, isVersionLessThanOrEqual, parseTagVersion, Version } from "@/lib/license";
import _ from "lodash";

const ANY_VERSION: Version = { major: 0, minor: 0, patch: 0 };

function v(strings: TemplateStringsArray) {
  const [major, minor, patch] = strings[0].split(".")
  return { major: parseInt(major), minor: parseInt(minor), patch: parseInt(patch) }
}

describe("License", () => {
  it("parse tag version correctly", () => {
    expect(parseTagVersion("v1.0.2")).toEqual({ major: 1, minor: 0, patch: 2 });
    expect(parseTagVersion("v10.12.11")).toEqual({
      major: 10,
      minor: 12,
      patch: 11,
    });
  });

  it("isVersionLessThanOrEqual",()=>{
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.2.3`)).toBe(true)
    expect(isVersionLessThanOrEqual(v`1.2.1`, v`1.2.3`)).toBe(true)
    expect(isVersionLessThanOrEqual(v`1.2.3`, v`1.0.0`)).toBe(false)
    expect(isVersionLessThanOrEqual(v`1.3.2`, v`1.2.3`)).toBe(false)
  })

  describe("License status", () => {
    function expectStatus(options: Parameters<typeof getLicenseStatus>[0]) {
      return expect(_.omit(getLicenseStatus(options), ["license"]));
    }

    it("Community - No license found", () => {
      expectStatus({
        licenses: [],
        currentDate: new Date(),
        currentVersion: ANY_VERSION,
      }).toEqual({
        edition: "community",
        condition: "No license found",
      });
    });

    it("Community - License expired", () => {
      expectStatus({
        licenses: [
          { validUntil: new Date("17-Sep-2024") } as TransportLicenseKey,
        ],
        currentDate: new Date("18-Sep-2024"),
        currentVersion: ANY_VERSION,
      }).toEqual({
        edition: "community",
        condition: "License expired",
      });
    });

    it("Ultimate - No app version restriction", () => {
      expectStatus({
        licenses: [
          {
            validUntil: new Date("17-Sep-2024"),
            maxAllowedAppVersion: null,
          } as TransportLicenseKey,
        ],
        currentDate: new Date("16-Sep-2024"),
        currentVersion: ANY_VERSION,
      }).toEqual({
        edition: "ultimate",
        condition: "No app version restriction",
      });
    });

    it("Ultimate - App version allowed", () => {
      expectStatus({
        licenses: [
          {
            validUntil: new Date("17-Sep-2024"),
            maxAllowedAppVersion: v`1.0.0`,
          } as TransportLicenseKey,
        ],
        currentDate: new Date("16-Sep-2024"),
        currentVersion: v`1.0.0`,
      }).toEqual({
        edition: "ultimate",
        condition: "App version allowed",
      });
    });

    it("Community - App version not allowed", () => {
      expectStatus({
        licenses: [
          {
            validUntil: new Date("17-Sep-2024"),
            maxAllowedAppVersion: v`1.0.0`,
          } as TransportLicenseKey,
        ],
        currentDate: new Date("16-Sep-2024"),
        currentVersion: v`1.0.1`,
      }).toEqual({
        edition: "community",
        condition: "App version not allowed",
      });
    });
  });
});
