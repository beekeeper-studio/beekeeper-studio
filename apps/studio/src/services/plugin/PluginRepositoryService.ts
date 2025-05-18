import { Octokit } from "@octokit/rest";
import { Release } from "./types";

export default class PluginRepositoryService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      userAgent: "Beekeeper Studio",
    });
  }

  async fetchLatestRelease(owner: string, repo: string): Promise<Release> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/releases/latest",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        owner,
        repo,
      }
    );
    const manifest = await this.fetchManifest(owner, repo);

    const asset = response.data.assets.find((asset) => asset.name === `${manifest.id}-${manifest.version}.zip`)
    if (!asset) {
      throw new Error(`No asset found matching ${manifest.id}-${manifest.version}.zip in the latest release`)
    }

    // Get the source code archive URL (either tarball or zipball)
    return {
      version: manifest.version,
      // FIXME rename this, it's not source
      sourceArchiveUrl: asset.browser_download_url,
    };
  }

  async fetchRegistry() {
    return await this.fetchJson(
      "beekeeper-studio",
      "beekeeper-studio-plugins",
      "plugins.json"
    );
  }

  async fetchManifest(owner: string, repo: string) {
    return await this.fetchJson(owner, repo, "manifest.json");
  }

  async fetchEntryInfo(owner: string, repo: string) {
    const latestRelease = await this.fetchLatestRelease(owner, repo);
    const readme = await this.fetchReadme(owner, repo);
    const manifest = await this.fetchManifest(owner, repo);
    return { latestRelease, readme, manifest };
  }

  private async fetchReadme(owner: string, repo: string) {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/readme",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        owner,
        repo,
      }
    );
    return Buffer.from(response.data.content, "base64").toString("utf-8");
  }

  private async fetchJson(owner: string, repo: string, path: string) {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          accept: "application/vnd.github+json",
        },
        owner,
        repo,
        path,
      }
    );
    // @ts-expect-error not fully typed
    const content = Buffer.from(response.data.content, "base64").toString(
      "utf-8"
    );
    return JSON.parse(content);
  }
}
