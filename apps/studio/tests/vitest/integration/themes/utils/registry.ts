import { ThemeManifest, ExtensionOrigin, RawPluginRegistryEntry } from "@/services/plugin";
import ExtensionRepositoryService from "@/services/extensions/ExtensionRepositoryService";
import { MockThemeServer } from "./server";
import BksConfig from "@/common/bksConfig";

export type Theme = {
  id: string;
  name: string;
  latestRelease: Pick<ThemeManifest, "version">;
  readme: string;
  origin: ExtensionOrigin;
};

/**
 * A mock theme repo.
 *
 * Usage:
 *
 * ```js
 * import ExtensionRegistry from "@/services/extensions/ExtensionRegistry";
 * import { MockThemeRepositoryService } from "./registry";
 *
 * const server = createThemeServer();
 * const repositoryService = new MockThemeRepositoryService(server);
 * repositoryService.themes = [
 *   {
 *     id: "test-theme",
 *     name: "Test Theme",
 *     latestRelease: { version: "1.0.0" },
 *     readme: "# Test Theme\n\nThis is a test theme.",
 *     origin: "community",
 *   },
 * ];
 * const registry = new ExtensionRegistry({
 *   repositoryService,
 *   registries: globals.themes.registries,
 * });
 * const manager = new ThemeManager({ fileManager, registry });
 * ```
 */
export class MockThemeRepositoryService extends ExtensionRepositoryService {
  themes: Theme[] = [];
  private server: MockThemeServer;

  constructor(server: MockThemeServer) {
    super({
      octokitOptions: {
        request: {
          fetch: (...args: Parameters<typeof fetch>) =>
            this.mockFetch(...args),
        },
      },
    });
    this.server = server;
    // This mock serves GitHub API responses, so official/community requests
    // must not be routed through the cloud proxy.
    BksConfig.pluginSystem.proxyGithubPluginRequests = false;
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
    const themes = this.themes.filter((t) =>
      path === "community-themes.json" && t.origin === "community"
    );
    const entries: RawPluginRegistryEntry[] = themes.map((t) => ({
      id: t.id,
      name: t.name,
      repo: repoStr(t),
      author: authorStr(t),
      description: descriptionStr(t),
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
    const theme = this.findTheme(owner, repo);
    const content = Buffer.from(theme.readme).toString("base64");
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
    const theme = this.findTheme(owner, repo);
    const manifest = this.buildManifest(theme);
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
    const theme = this.findTheme(owner, repo);
    const manifest = this.buildManifest(theme);
    const buf = Buffer.from(JSON.stringify(manifest));
    return Promise.resolve(
      new Response(buf, {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      })
    );
  }

  private findTheme(owner: string, repo: string): Theme {
    const theme = this.themes.find(
      (t) => repoStr(t) === `${owner}/${repo}`
    );
    if (!theme) {
      throw new Error(
        `Theme "${owner}/${repo}" not found in registry. Have you registered the theme?`
      );
    }
    return theme;
  }

  private buildManifest(theme: Theme): ThemeManifest {
    return {
      id: theme.id,
      name: theme.name,
      version: theme.latestRelease.version,
      author: authorStr(theme),
      description: descriptionStr(theme),
    };
  }
}

function repoStr(theme: Theme): string {
  return `${theme.id}/${theme.id}`;
}

function authorStr(theme: Theme) {
  return `${theme.id}-author`;
}

function descriptionStr(theme: Theme) {
  return `${theme.name} description`;
}
