import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { LicenseKey } from "@/common/appdb/models/LicenseKey";
import { LicenseHandlers } from "@/handlers/licenseHandlers";
import { OfflineLicense } from "@/backend/lib/OfflineLicense";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";

// Mock the OfflineLicense module
vi.mock("@/backend/lib/OfflineLicense", () => {
  return {
    OfflineLicense: {
      load: vi.fn()
    }
  };
});

describe("LicenseHandlers", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
    // Clean up any existing licenses
    await LicenseKey.clear();
    
    // Reset the mock
    vi.clearAllMocks();
    (OfflineLicense.load as Mock).mockReturnValue(null);
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  describe("license/get", () => {
    it("should return an empty array when no licenses exist", async () => {
      const result = await LicenseHandlers["license/get"]();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(0);
    });

    it("should return licenses when they exist", async () => {
      // Create a trial license
      await LicenseKey.createTrialLicense();
      
      const result = await LicenseHandlers["license/get"]();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).not.toBeNull();
      expect(result[0].licenseType).toBe("TrialLicense");
    });

    it("should not return [null] when licenses exist", async () => {
      // Create a trial license
      await LicenseKey.createTrialLicense();
      
      const result = await LicenseHandlers["license/get"]();
      
      // The result should not be [null]
      expect(result).not.toEqual([null]);
      
      // Make sure no null values in the array
      const filteredResult = result.filter(Boolean);
      expect(filteredResult.length).toBe(result.length);
    });

    it("should return offline license when available", async () => {
      // Mock offline license
      const mockLicense = {
        isValid: true,
        toLicenseKey: vi.fn().mockReturnValue({ 
          id: 999, 
          licenseType: "PersonalLicense",
          fromFile: true
        })
      };
      (OfflineLicense.load as Mock).mockReturnValue(mockLicense);
      
      const result = await LicenseHandlers["license/get"]();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).not.toBeNull();
      expect(result[0].fromFile).toBe(true);
      expect(mockLicense.toLicenseKey).toHaveBeenCalled();
    });

    it("should handle invalid offline license correctly", async () => {
      // Mock invalid offline license
      const mockLicense = {
        isValid: false,
        toLicenseKey: vi.fn().mockReturnValue(null)
      };
      (OfflineLicense.load as Mock).mockReturnValue(mockLicense);
      
      // Create a trial license in the database
      await LicenseKey.createTrialLicense();
      
      const result = await LicenseHandlers["license/get"]();
      
      // The result should not be [null]
      expect(result).not.toEqual([null]);
      
      // The handler should fall back to database licenses
      expect(result.length).toBe(1);
      expect(result[0].licenseType).toBe("TrialLicense");
    });
  });

  describe("license/getStatus", () => {
    async function saveLicense(options: { validUntil: Date; supportUntil: Date }) {
      const license = new LicenseKey();
      license.email = "fake-email";
      license.key = "fake-key";
      license.validUntil = options.validUntil;
      license.supportUntil = options.supportUntil;
      license.licenseType = "PersonalLicense";
      license.maxAllowedAppRelease = null;
      await license.save();
    }

    it("includes cloud workspace access flags as own properties for a lifetime license", async () => {
      // Support period over, license still valid = lifetime terms.
      await saveLicense({
        validUntil: new Date(Date.now() + 86_400_000),
        supportUntil: new Date(Date.now() - 86_400_000),
      });

      const status = await LicenseHandlers["license/getStatus"]();

      // The status crosses to the renderer via postMessage (structured
      // clone), which drops prototype getters - the flags must be own
      // properties of the returned object.
      expect(Object.getOwnPropertyNames(status)).toEqual(
        expect.arrayContaining(["isLifetime", "canAccessCloudWorkspaces"])
      );
      expect(status.isLifetime).toBe(true);
      expect(status.canAccessCloudWorkspaces).toBe(false);
    });

    it("reports cloud workspace access for an active subscription", async () => {
      await saveLicense({
        validUntil: new Date(Date.now() + 86_400_000),
        supportUntil: new Date(Date.now() + 86_400_000),
      });

      const status = await LicenseHandlers["license/getStatus"]();

      expect(status.isLifetime).toBe(false);
      expect(status.canAccessCloudWorkspaces).toBe(true);
    });
  });

  describe("starting a trial", () => {
    const monthsAgo = (months: number) => new Date(new Date().setMonth(new Date().getMonth() - months));
    const canStartTrial = async () => (await LicenseHandlers["license/getStatus"]()).canStartTrial;

    async function savePaidLicense() {
      const license = new LicenseKey();
      license.email = "someone@example.com";
      license.key = "abc-123";
      license.validUntil = new Date(Date.now() + 86_400_000);
      license.supportUntil = license.validUntil;
      license.licenseType = "PersonalLicense";
      return await license.save();
    }

    it("is open without any license", async () => {
      expect(await canStartTrial()).toBe(true);
      await LicenseHandlers["license/createTrialLicense"]();
      expect((await LicenseHandlers["license/getStatus"]()).isTrial).toBe(true);
    });

    it("is closed during a trial, and for six months after it ends", async () => {
      await LicenseKey.createTrialLicense();
      expect(await canStartTrial()).toBe(false);

      await LicenseKey.clear();
      await LicenseKey.createTrialLicense(monthsAgo(5), monthsAgo(5));
      expect(await canStartTrial()).toBe(false);
      await expect(LicenseHandlers["license/createTrialLicense"]()).rejects.toThrow("Not allowed");
    });

    it("opens again six months after a trial ends, keeping the old trial", async () => {
      await LicenseKey.createTrialLicense(monthsAgo(7), monthsAgo(7));
      expect(await canStartTrial()).toBe(true);

      await LicenseHandlers["license/createTrialLicense"]();

      const status = await LicenseHandlers["license/getStatus"]();
      expect(status.isTrial).toBe(true);
      expect(status.isUltimate).toBe(true);
      expect(status.canStartTrial).toBe(false);
      const trials = await LicenseKey.findBy({ licenseType: "TrialLicense" });
      expect(trials.map((t) => t.key).sort()).toEqual(["fake", "fake-2"]);
    });

    it("stays closed after an old trial for anyone who has a license", async () => {
      await LicenseKey.createTrialLicense(monthsAgo(7), monthsAgo(7));
      await savePaidLicense();
      expect(await canStartTrial()).toBe(false);
    });

    it("stays closed after an old trial for anyone who ever registered a license", async () => {
      await LicenseKey.createTrialLicense(monthsAgo(7), monthsAgo(7));
      const license = await savePaidLicense();
      await LicenseHandlers["license/remove"]({ id: license.id });

      expect(await LicenseKey.find()).toHaveLength(1);
      expect(await canStartTrial()).toBe(false);
      await expect(LicenseHandlers["license/createTrialLicense"]()).rejects.toThrow("Not allowed");
    });

    it("stays closed when a license was registered and removed before the trial", async () => {
      const license = await savePaidLicense();
      await LicenseHandlers["license/remove"]({ id: license.id });
      await LicenseKey.createTrialLicense(monthsAgo(7), monthsAgo(7));
      expect(await canStartTrial()).toBe(false);
    });

    it("is closed with an offline license file", async () => {
      (OfflineLicense.load as Mock).mockReturnValue({
        isValid: true,
        toLicenseStatus: () => ({ edition: "ultimate", condition: [], fromFile: true }),
      });
      expect(await canStartTrial()).toBe(false);
    });
  });
});
