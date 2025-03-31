import { OfflineLicense, LicenseOptions } from '@/backend/lib/OfflineLicense'
import { TestOrmConnection } from '@tests/lib/TestOrmConnection'

/**
 * Payload looks like this (for good license):
 * {
  "license_key": {
    "valid_until": "2099-01-01T06:00:00.000Z",
    "support_until": "2099-01-01T06:00:00.000Z",
    "customer_support_until": "2099-01-01T06:00:00.000Z",
    "created_at": "2024-12-14T03:38:52.989Z",
    "license_type": "PersonalLicense",
    "email": "123",
    "id": 4,
    "key": "e605ca57-2115-4b21-b1ec-690f997df38e",
    "subscription": true,
    "max_allowed_app_release": null
  },
  "errors": null,
  "status": 200
}
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

})
