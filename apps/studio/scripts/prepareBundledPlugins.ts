/**
 * Download all core plugins to the bundled plugins directory.
 */

import PluginFileManager from "@/services/plugin/PluginFileManager";
import PluginRegistry from "@/services/plugin/PluginRegistry";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { existsSync, readdirSync } from "fs";

const pluginsDirectory = 'extra_resources/bundled_plugins';
const fileManager = new PluginFileManager({ pluginsDirectory });
const registry = new PluginRegistry(new PluginRepositoryService());

async function run() {
  // Check if plugins directory exists and has plugins
  if (existsSync(pluginsDirectory)) {
    const files = readdirSync(pluginsDirectory);
    if (files.length > 0) {
      console.log(`✔ Bundled plugins already exist in ${pluginsDirectory}, skipping download`);
      return;
    }
  }

  const entries = await registry.getEntries();

  console.log(`▶ Downloading ${entries.length} plugins to ${pluginsDirectory}`);

  for (let i = 0; i < entries.length; i++) {
    const { id } = entries[i];

    process.stdout.write(`[${i + 1}/${entries.length}] ${id} `);

    try {
      const repository = await registry.getRepository(id);
      const version = repository.latestRelease.manifest.version;

      process.stdout.write(`v${version} ... `);

      await fileManager.download(id, repository.latestRelease);
      console.log(`done`);
    } catch (err) {
      console.log(`failed`);
      const message = err?.message?.toLowerCase?.() ?? "";
      if (message.includes("rate limit") || message.includes("api rate")) {
        printRateLimitWarning();
      }
      throw err;
    }
  }

  console.log(`✔ All plugins downloaded`);
}

function printRateLimitWarning() {
  const yellow = "\x1b[33m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";

  const lines = [
    " GitHub API rate limit hit ",
    "",
    " This happened during build process while downloading a Beekeeper Studio plugin.",
    "",
    " Fix, provide a GitHub token to your environment:",
    "   export GITHUB_TOKEN=your_token_here",
    "",
    " Any GitHub personal access token works."
  ];

  const width = Math.max(...lines.map(l => l.length)) + 4;
  const border = "─".repeat(width - 2);

  console.error(
    "\n" +
    yellow + bold +
    `┌${border}┐\n` +
    lines.map(l => `│ ${l.padEnd(width - 4)} │`).join("\n") +
    `\n└${border}┘` +
    reset +
    "\n"
  );
}


run();
