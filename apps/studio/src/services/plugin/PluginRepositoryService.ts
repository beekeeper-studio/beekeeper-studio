import { Octokit } from "@octokit/rest";
import { Manifest } from "./types";

export default class PluginRepositoryService {
  private octokit = new Octokit();

  async fetchPluginManifest(owner: string, repo: string): Promise<Manifest> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/contents/manifest.json",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        owner,
        repo,
      }
    );
    const content = Buffer.from(response.data.content, "base64").toString(
      "utf-8"
    );
    return JSON.parse(content);
  }

  async fetchPluginReadme(owner: string, repo: string): Promise<string> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/contents/README.md",
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
}
