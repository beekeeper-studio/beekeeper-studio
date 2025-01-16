import { OfflineLicense, LicenseOptions } from '@/backend/lib/OfflineLicense'


describe("Offline License", () => {


  beforeAll(() => {

  })

  it("Good license: should be valid", async () => {

    const publicKeyPath = "tests/resources/public.pem"
    const goodLicense = 'tests/resources/good.license'

    const options = {
      licensePath: goodLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)

    expect(license.isValid()).toBeTruthy()

  })

  it("Bad license: Should not be valid", async() => {
    const publicKeyPath = "tests/resources/public.pem"
    const badLicense = "tests/resources/bad.license"
    const options = {
      licensePath: badLicense,
      keyPath: publicKeyPath
    }

    const license = new OfflineLicense(options)

    expect(license.isValid()).not.toBeTruthy()

  })

})
