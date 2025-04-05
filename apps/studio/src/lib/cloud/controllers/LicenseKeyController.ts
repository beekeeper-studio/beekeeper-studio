import { ILicenseKey } from "@/common/interfaces/ILicenseKey";
import { AxiosInstance } from "axios";
import { res, url } from "../ClientHelpers";
import platformInfo from "@/common/platform_info";

interface InstallationInfo {
  osType: string;
  architecture: string;
  installationId: string;
}

export class LicenseKeyController {
  constructor(protected axios: AxiosInstance) {

  }
  path = '/api/license_keys'

  async get(email: string, key: string, installationId = ""): Promise<ILicenseKey> {
    const params = {
      email
    }

    // Initialize headers object
    const headers: Record<string, string> = {};

    // Only include the installation ID header if we have a valid ID
    if (installationId) {
      // Create the installation info object with platform info and installation ID
      const installationInfo: InstallationInfo = {
        osType: platformInfo.platform,
        architecture: process.arch,
        installationId: installationId
      };

      // Base64 encode the installation info for the header
      const encodedInstallationInfo = Buffer.from(JSON.stringify(installationInfo)).toString('base64');

      // Add the installation info header to the request
      headers['x-installation-id'] = encodedInstallationInfo;
    }

    const response = await this.axios.get(url(this.path, key), {
      params,
      headers
    });

    return res(response, 'licenseKey');
  }
}
