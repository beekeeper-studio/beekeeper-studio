import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import plugins from "../plugins.json";

const pluginsDirectory = 'extra_resources/bundled_plugins';
const fileManager = new PluginFileManager({ pluginsDirectory });
const registry = new PluginRegistry(new PluginRepositoryService());
const pluginIds = Object.keys(plugins.bundled);

async function run() {
  console.log("Downloading plugins to", pluginsDirectory, "...");
  for (const id of pluginIds) {
    const repository = await registry.getRepository(id);
    await fileManager.download(id, repository.latestRelease);
    console.log("Downloaded", id);
  }
}

run();
