import { Octokit } from "@octokit/rest";
import { PluginRepository, Release } from "./types";
import rawLog from "@bksLogger";
import { PluginFetchError } from "@commercial/backend/plugin-system/errors";
import semver from "semver";

const log = rawLog.scope("PluginRepositoryService");

export default class PluginRepositoryService {
  private octokit: Octokit;

  constructor(options: { apiKey?: string } = {}) {
    this.octokit = new Octokit({
      userAgent: "Beekeeper Studio",
      auth: options.apiKey,
    });
  }

  async fetchReleases(owner: string, repo: string): Promise<Release[]> {
    const response = await this.octokit.request(
      "GET /repos/{owner}/{repo}/releases",
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
        owner,
        repo,
      }
    );

    const releases: Release[] = [];

    for (const release of response.data) {
      console.log(release);
      if (release.draft) {
        continue;
      }

      if (!semver.valid(release.tag_name)) {
        log.warn(
          `Release tag name "${release.tag_name}" is not a valid semver.`
        );
        continue;
      }

      const version = new semver.SemVer(release.tag_name);
      const pattern = `^.+-${version}\\.zip$`;
      const regex = new RegExp(pattern);
      const asset = release.assets.find((asset) => regex.test(asset.name));
      if (!asset) {
        throw new PluginFetchError(
          `No asset found matching pattern ${pattern} in release ${release.tag_name}`
        );
      }

      releases.push({
        version,
        beta: release.prerelease,
        sourceArchiveUrl: asset.browser_download_url,
      });
    }

    return releases;
  }

  async fetchRegistry() {
    return await this.fetchJson(
      "beekeeper-studio",
      "beekeeper-studio-plugins",
      "plugins.json"
    );
  }

  async fetchPluginRepository(owner: string, repo: string): Promise<PluginRepository> {
    const releases = await this.fetchReleases(owner, repo);
    const readme = await this.fetchReadme(owner, repo);
    return { releases, readme };
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
