import { Octokit } from "@octokit/rest";
import { Manifest, PluginRepository, Release } from "./types";

export default class PluginRepositoryService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      userAgent: "Beekeeper Studio",
      auth: process.env.GITHUB_TOKEN,
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

    const manifestAsset = response.data.assets.find((asset) => asset.name === "manifest.json")

    if (!manifestAsset) {
      throw new Error(`No manifest.json found in the latest release`)
    }

    const manifestResponse = await this.octokit.request(
      "GET /repos/{owner}/{repo}/releases/assets/{asset_id}",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          "accept": "application/octet-stream",
        },
        owner,
        repo,
        asset_id: manifestAsset.id,
      }
    )

    const rawManifest = manifestResponse.data as unknown as ArrayBuffer
    const manifest: Manifest = JSON.parse(Buffer.from(rawManifest).toString("utf-8"))

    const asset = response.data.assets.find((asset) => asset.name === `${manifest.id}-${manifest.version}.zip`)
    if (!asset) {
      throw new Error(`No asset found matching ${manifest.id}-${manifest.version}.zip in the latest release`)
    }

    return {
      manifest,
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

  async fetchPluginRepository(owner: string, repo: string): Promise<PluginRepository> {
    const latestRelease = await this.fetchLatestRelease(owner, repo);
    const readme = await this.fetchReadme(owner, repo);
    return { latestRelease, readme };
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
