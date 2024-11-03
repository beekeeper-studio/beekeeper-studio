// original code Copyright (c) 2023 Michael
const fetch = require("node-fetch");

module.exports = async (octo, sourceRepo, destRepo, sourceReleaseId, destReleaseId) => {
  const gitHubKey = process.env.GITHUB_TOKEN;

  // Get the source release
  const [owner, repo] = sourceRepo.split("/");
  const { data: sourceRelease } = await octo.rest.repos.getRelease({
    owner,
    repo,
    release_id: sourceReleaseId, // Corrected key from sourceReleaseId to release_id
  });

  // Copy assets
  const [destRepoOwner, destRepoName] = destRepo.split("/");
  const assetPromises = sourceRelease.assets.map(async (asset) => {
    try {
      // Fetch asset URL
      const { data: assetData } = await octo.rest.repos.getReleaseAsset({
        owner,
        repo,
        asset_id: asset.id,
        headers: {
          Accept: "application/octet-stream",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const assetUrl = assetData.url;

      // Download the asset data
      const response = await fetch(assetUrl, {
        headers: {
          Accept: "application/octet-stream",
          Authorization: `token ${gitHubKey}`, // Removed angle brackets around token
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download asset ${asset.name}: ${response.statusText}`);
      }

      const data = await response.buffer();

      console.log("uploading asset -> ", asset.name);

      // Upload the asset to the destination release
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
    } catch (error) {
      console.error(`Failed to process asset ${asset.name}: ${error.message}`);
      process.exit(1); // Optional: consider removing if you don't want to terminate on a single failure
    }
  });

  await Promise.all(assetPromises);
};
