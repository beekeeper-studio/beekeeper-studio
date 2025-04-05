import { ILicenseKey } from "@/common/interfaces/ILicenseKey";
import { AxiosInstance } from "axios";
import { res, url } from "../ClientHelpers";
import { IPlatformInfo } from "@/common/IPlatformInfo";
import rawLog from '@bksLogger'

const log = rawLog.scope('LicenseKeyController')

interface InstallationInfo {
  osType: string;
  architecture: string;
  installationId: string;
}

export class LicenseKeyController {
  constructor(protected axios: AxiosInstance) {

  }
  path = '/api/license_keys'

  async get(email: string, key: string, installationId = "", platformInfo: IPlatformInfo): Promise<ILicenseKey> {
    const params = {
      email
    }
    log.info("license key get")

    // Initialize headers object
    const headers = {};

    // Only include the installation ID header if we have a valid ID
    if (installationId) {
      // Create the installation info object with platform info and installation ID
      const installationInfo: InstallationInfo = {
        osType: platformInfo.platform,
        architecture: platformInfo.isArm ? 'arm64' : 'amd64',
        installationId: installationId
      };


      // Base64 encode the installation info for the header
      const encodedInstallationInfo = Buffer.from(JSON.stringify(installationInfo)).toString('base64');

      // Add the installation info header to the request
      headers['X-Installation-Id'] = encodedInstallationInfo;
      log.info("made headers")
    }
    log.info("making request for license", key, installationId, headers)

    const response = await this.axios.get(url(this.path, key), {
      params,
      headers
    });


    return res(response, 'licenseKey');
  }
}
