import { Manifest, PluginOrigin, PluginRegistryEntry } from "@/services/plugin";
import PluginRepositoryService from "@/services/plugin/PluginRepositoryService";
import { MockPluginServer } from "./server";

export type Plugin = {
  id: string;
  name: string;
  latestRelease: Pick<Manifest, "version" | "minAppVersion">;
  readme: string;
  origin: PluginOrigin;
};

/**
 * A mock plugin repo.
 *
 * Usage:
 *
 * ```js
 * import { PluginRegistry } from "@/services/plugin/PluginRegistry";
 * import { MockPluginRepositoryService } from "./registry";
 *
 * const server = createPluginServer();
 * const registry = new PluginRegistry(new MockPluginRepositoryService(server));
 * registry.plugins = [
 *   {
 *     id: "test-plugin",
 *     name: "Test Plugin",
 *     latestRelease: { version: "2.0.0", minAppVersion: "5.4.0" },
 *     readme: "# Test Plugin\n\nThis is a test plugin.",
 *   },
 * ];
 * const manager = new PluginManager({ registry });
 * ```
 */
export class MockPluginRepositoryService extends PluginRepositoryService {
  plugins: Plugin[] = [];
  private server: MockPluginServer;

  constructor(server: MockPluginServer) {
    super({
      octokitOptions: {
        request: {
          fetch: (...args: Parameters<typeof fetch>) =>
            this.mockFetch(...args),
        },
      },
    });
    this.server = server;
  }

  mockFetch(
    input: Parameters<typeof fetch>[0],
    _init?: Parameters<typeof fetch>[1]
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();

    // GET /repos/{owner}/{repo}/contents/{path} — used by fetchJson
    const contentsMatch = url.match(
      /\/repos\/([^/]+)\/([^/]+)\/contents\/(.+)/
    );
    if (contentsMatch) {
      return this.handleContents(contentsMatch[3]);
    }

    // GET /repos/{owner}/{repo}/readme — used by fetchReadme
    const readmeMatch = url.match(/\/repos\/([^/]+)\/([^/]+)\/readme/);
    if (readmeMatch) {
      return this.handleReadme(readmeMatch[1], readmeMatch[2]);
    }

    // GET /repos/{owner}/{repo}/releases/assets/{asset_id} — used by
    // fetchLatestRelease (second request, fetches manifest.json content)
    const assetMatch = url.match(
      /\/repos\/([^/]+)\/([^/]+)\/releases\/assets\/(\d+)/
    );
    if (assetMatch) {
      return this.handleReleaseAsset(assetMatch[1], assetMatch[2]);
    }

    // GET /repos/{owner}/{repo}/releases/latest — used by fetchLatestRelease
    const latestMatch = url.match(
      /\/repos\/([^/]+)\/([^/]+)\/releases\/latest/
    );
    if (latestMatch) {
      return this.handleLatestRelease(latestMatch[1], latestMatch[2]);
    }

    return Promise.resolve(
      new Response("Not Found", { status: 404 })
    );
  }

  private handleContents(path: string): Promise<Response> {
    const plugins = this.plugins.filter((p) =>
      path === "plugins.json"
        ? p.origin === "official"
        : p.origin === "community"
    );
    const entries: PluginRegistryEntry[] = plugins.map((p) => ({
      id: p.id,
      name: p.name,
      repo: repoStr(p),
      author: authorStr(p),
      description: descriptionStr(p),
    }));
    const content = Buffer.from(JSON.stringify(entries)).toString("base64");
    return Promise.resolve(
      new Response(JSON.stringify({ content }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  private handleReadme(owner: string, repo: string): Promise<Response> {
    const plugin = this.findPlugin(owner, repo);
    const content = Buffer.from(plugin.readme).toString("base64");
    return Promise.resolve(
      new Response(JSON.stringify({ content }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  private handleLatestRelease(
    owner: string,
    repo: string
  ): Promise<Response> {
    const plugin = this.findPlugin(owner, repo);
    const manifest = this.buildManifest(plugin);
    const zipName = `${manifest.id}-${manifest.version}.zip`;
    const body = {
      assets: [
        {
          id: 1,
          name: "manifest.json",
        },
        {
          id: 2,
          name: zipName,
          browser_download_url: this.server.formatUrl(manifest),
        },
      ],
    };
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  private handleReleaseAsset(
    owner: string,
    repo: string,
  ): Promise<Response> {
    const plugin = this.findPlugin(owner, repo);
    const manifest = this.buildManifest(plugin);
    const buf = Buffer.from(JSON.stringify(manifest));
    return Promise.resolve(
      new Response(buf, {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      })
    );
  }

  private findPlugin(owner: string, repo: string): Plugin {
    const plugin = this.plugins.find(
      (p) => repoStr(p) === `${owner}/${repo}`
    );
    if (!plugin) {
      throw new Error(
        `Plugin "${owner}/${repo}" not found in registry. Have you registered the plugin?`
      );
    }
    return plugin;
  }

  private buildManifest(plugin: Plugin): Manifest {
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.latestRelease.version,
      minAppVersion: plugin.latestRelease.minAppVersion,
      author: authorStr(plugin),
      description: descriptionStr(plugin),
      capabilities: {
        views: [],
        menu: [],
      },
      manifestVersion: 1,
    };
  }
}

function repoStr(plugin: Plugin): string {
  return `${plugin.id}/${plugin.id}`;
}

function authorStr(plugin: Plugin) {
  return `${plugin.id}-author`;
}

function descriptionStr(plugin: Plugin) {
  return `${plugin.name} description`;
}
