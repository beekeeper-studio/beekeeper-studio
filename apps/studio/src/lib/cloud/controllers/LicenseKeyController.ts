import { ILicenseKey } from "@/common/interfaces/ILicenseKey";
import { AxiosInstance } from "axios";
import { res, url } from "../ClientHelpers";




export class LicenseKeyController {
  constructor(protected axios: AxiosInstance) {

  }
  path = '/api/license_keys'

  async get(email:string, key: string): Promise<ILicenseKey> {
    const params = {
      email
    }
    const response = await this.axios.get(url(this.path, key), { params })
    return res(response, 'licenseKey')
  }
}
