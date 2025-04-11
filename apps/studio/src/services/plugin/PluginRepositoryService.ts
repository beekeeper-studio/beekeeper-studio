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
    return {
      version: response.data.tag_name,
      manifestDownloadUrl: response.data.assets.find(
        (a) => a.name === "manifest.json"
      ).browser_download_url,
      scriptDownloadUrl: response.data.assets.find((a) => a.name === "index.js")
        .browser_download_url,
      styleDownloadUrl: response.data.assets.find((a) => a.name === "style.css")
        .browser_download_url,
    };
  }

  async fetchRegistry() {
    return await this.fetchJson(
      "beekeeper-studio",
      "beekeeper-studio-plugins",
      "plugins.json"
    );
  }

  async fetchEntryInfo(owner: string, repo: string) {
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
