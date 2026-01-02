/**
 * Prepare bundled plugins (download if missing)
 */

import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { existsSync, mkdirSync } from "fs";

(async function run() {
  if (process.env.SKIP_BUNDLED_PLUGINS) {
    console.log("▶ Skipping bundled plugin preparation");
    return;
  }

  const pluginsDirectory = 'extra_resources/bundled_plugins';
  const fileManager = new PluginFileManager({ pluginsDirectory });
  const registry = new PluginRegistry(new PluginRepositoryService());
  const entries = await registry.getEntries();

  console.log(`▶ Found ${entries.length} plugins in registry`);

  // Check if plugins directory exists and has plugins
  if (!existsSync(pluginsDirectory)) {
    console.log(`▶ Creating ${pluginsDirectory} directory`);
    mkdirSync(pluginsDirectory);
  }

  if (entries.length === 0) {
    console.log("✔ All bundled plugins already present");
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const pluginPath = `${pluginsDirectory}/${entry.id}`;

    process.stdout.write(`[${i + 1}/${entries.length}] ${entry.id} `);

    try {
      if (!existsSync(pluginPath)) {
        process.stdout.write(`downloading... `);
        const repository = await registry.getRepository(entry.id);
        await fileManager.download(entry.id, repository.latestRelease);
      }

      console.log(`OK`);
    } catch (err) {
      console.log(`FAILED`);
      const message = err?.message?.toLowerCase?.() ?? "";
      if (message.includes("rate limit") || message.includes("api rate")) {
        console.error(
          "\n" +
          "\x1b[33m\x1b[1m" +
          "┌────────────────────────────────────────────────────────────────────────────┐\n" +
          "│  GitHub API rate limit hit                                                 │\n" +
          "│                                                                            │\n" +
          "│  This happened during build process while downloading a Beekeeper Studio   │\n" +
          "│  plugin.                                                                   │\n" +
          "│                                                                            │\n" +
          "│  Fix: provide a GitHub token to your environment:                          │\n" +
          "│    export GITHUB_TOKEN=your_token_here                                     │\n" +
          "│                                                                            │\n" +
          "│  Or skip bundled plugin preparation entirely:                              │\n" +
          "│    export SKIP_BUNDLED_PLUGINS=1                                           │\n" +
          "│                                                                            │\n" +
          "│  Any GitHub personal access token works.                                   │\n" +
          "└────────────────────────────────────────────────────────────────────────────┘" +
          "\x1b[0m\n"
        );
      }
      throw err;
    }
  }

  console.log("✔ Bundled plugins OK");
})();
