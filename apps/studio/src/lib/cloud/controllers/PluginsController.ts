import { PluginRepository, RawPluginRegistryEntry } from "@/services/plugin";
import { AxiosInstance } from "axios";
import { res, url } from "../ClientHelpers";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginsController")

export class PluginsController {
  constructor(protected axios: AxiosInstance) {

  }

  path = '/api/plugins'

  async getRegistry(name: string): Promise<RawPluginRegistryEntry[]> {
    const response = await this.axios.get(url(this.path, 'registries', name));

    log.info("getRegistry response: ", response);

    return res(response, "plugins");
  }

  async getRepository(owner: string, repo: string): Promise<PluginRepository> {
    const response = await this.axios.get(url(this.path, 'repositories', owner, repo));

    return res(response, "repository");
  }
}
