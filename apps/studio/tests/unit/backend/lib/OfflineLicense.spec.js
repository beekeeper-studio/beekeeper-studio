import { OfflineLicense, LicenseOptions } from '@/backend/lib/OfflineLicense'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'
import { LicenseStatus } from '@/lib/license'
import path from 'path'

/**
 * Payload looks like this (for good license):
 * {
 *  "license_key": {
 *    "valid_until": "2099-01-01T06:00:00.000Z",
 *    "support_until": "2099-01-01T06:00:00.000Z",
 *    "customer_support_until": "2099-01-01T06:00:00.000Z",
 *    "created_at": "2024-12-14T03:38:52.989Z",
 *    "license_type": "PersonalLicense",
 *    "email": "123",
 *    "id": 4,
 *    "key": "e605ca57-2115-4b21-b1ec-690f997df38e",
 *    "subscription": true,
 *    "max_allowed_app_release": null
 *  },
 *  "errors": null,
 *  "status": 200
 *}
 */


describe("Offline License", () => {

 /**
  * @type {OfflineLicense}
  */
  let goodOfflineLicense = null

  beforeAll(async () => {
    await TestOrmConnection.connect()
    const publicKeyPath = "tests/resources/public.pem"
    const goodLicense = 'tests/resources/good.license'

    const options = {
      licensePath: goodLicense,
      keyPath: publicKeyPath
    }

    goodOfflineLicense = new OfflineLicense(options)

  })

  afterAll(async () => {
    await TestOrmConnection.disconnect()
  })

  it("Good license: should be valid", async () => {

    expect(goodOfflineLicense.isValid).toBeTruthy()

  })

  it("Good license: Should extract data properly", async () => {
    const key = goodOfflineLicense.toLicenseKey()
    expect(key.validUntil).toEqual(new Date("2099-01-01T06:00:00.000Z"))
    expect(key.key).toEqual("e605ca57-2115-4b21-b1ec-690f997df38e")
    expect(key.supportUntil).toEqual(new Date("2099-01-01T06:00:00.000Z"))
  })

  it("Bad license: Should not be valid", async() => {
    const publicKeyPath = "tests/resources/public.pem"
    const badLicense = "tests/resources/bad.license"
    const options = {
      licensePath: badLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)

    expect(license.isValid).not.toBeTruthy()
  })

  // Additional tests begin here

  it("Should check for exists() method with valid license", async () => {
    expect(goodOfflineLicense.exists()).toBeTruthy()
  })

  it("Should handle non-existent license file", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const nonExistentLicense = "tests/resources/nonexistent.license"
    const options = {
      licensePath: nonExistentLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)
    expect(license.isValid).toBeFalsy()
    expect(license.exists()).toBeFalsy()
  })

  it("Should handle non-existent public key file", async () => {
    const nonExistentKey = "tests/resources/nonexistent.pem"
    const goodLicense = 'tests/resources/good.license'
    const options = {
      licensePath: goodLicense,
      keyPath: nonExistentKey
    }

    const license = new OfflineLicense(options)
    expect(license.isValid).toBeFalsy()
  })

  it("Should handle invalid JSON in license file", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const invalidJsonLicense = "tests/resources/invalid_json.license"
    const options = {
      licensePath: invalidJsonLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)
    expect(license.isValid).toBeFalsy()
    expect(license.error).toBeDefined()
  })

  it("Should correctly generate LicenseStatus for valid license", async () => {
    const status = goodOfflineLicense.toLicenseStatus()
    
    expect(status).toBeInstanceOf(Object)
    expect(status.fromFile).toBeTruthy()
    expect(status.filePath).toEqual(goodOfflineLicense.path)
    expect(status.isUltimate).toBeDefined()
    expect(status.isCommunity).toBeDefined()
  })

  it("Should return null from toLicenseKey() for invalid license", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const badLicense = "tests/resources/bad.license"
    const options = {
      licensePath: badLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)
    expect(license.toLicenseKey()).toBeNull()
  })

  it("Should cache license instance when using load() static method", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const goodLicense = 'tests/resources/good.license'

    const options = {
      licensePath: goodLicense,
      keyPath: publicKeyPath
    }

    const license1 = OfflineLicense.load(options)
    const license2 = OfflineLicense.load() // Should return cached instance
    
    expect(license1).toBe(license2) // Should be the same instance
  })

  it("Should handle license file with missing signature", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const missingSignature = "tests/resources/missing_signature.license"
    const options = {
      licensePath: missingSignature,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)
    expect(license.isValid).toBeFalsy()
  })

  it("Should handle license file with missing data", async () => {
    const publicKeyPath = "tests/resources/public.pem"
    const missingData = "tests/resources/missing_data.license"
    const options = {
      licensePath: missingData,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)
    expect(license.isValid).toBeFalsy()
  })

  it("Should use default paths when no options provided", async () => {
    const license = new OfflineLicense()
    expect(license.path).toBeDefined()
    expect(license.publicKeyPath).toBeDefined()
  })
})