// original code Copyright (c) 2023 Michael
const core = require("@actions/core");
const { retry } = require("@octokit/plugin-retry");
const { GitHub, getOctokitOptions } = require("@actions/github/lib/utils");
const fetch = require("node-fetch");

module.exports = async(sourceRepo, destRepo, sourceReleaseId, destReleaseId) => {

  const gitHubKey = process.env.GITHUB_TOKEN || core.getInput("github_token", { required: true });
  const octokit = GitHub.plugin(retry);
  const octo = new octokit(getOctokitOptions(gitHubKey));
  // Get the source release
  const [ owner, repo ] = sourceRepo.split("/")
  const { data: sourceRelease } = await octo.rest.repos.getRelease({
    owner,
    repo,
    sourceReleaseId,
  });

  // Copy assets
  const [destRepoOwner, destRepoName] = destRepo.split("/");
  const assetPromises = sourceRelease.assets.map(async (asset) => {
    const { url: assetUrl } = await octo.request(
      "GET /repos/{owner}/{repo}/releases/assets/{asset_id}",
      {
        owner,
        repo,
        asset_id: asset.id,
        headers: {
          Accept: "application/octet-stream",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    const data = await fetch(assetUrl, {
      headers: {
        accept: "application/octet-stream",
        authorization: `token <${gitHubKey}>`,
      },
    })
    .then((x) => x.buffer())
    .catch((err) => {
      core.setFailed(`Fail to download file ${url}: ${err}`);
      return undefined;
    });
    if (data === undefined) return;

    console.log("uploading asset -> ", asset.name)
    await octo.rest.repos.uploadReleaseAsset({
      owner: destRepoOwner,
      repo: destRepoName,
      release_id: destReleaseId,
      name: asset.name,
      label: asset.label,
      data,
      headers: {
        "content-length": asset.size,
        "content-type": asset.content_type,
      },
    });
  });
  await Promise.all(assetPromises);

  const time = new Date().toTimeString();
  core.setOutput("time", time);
}

