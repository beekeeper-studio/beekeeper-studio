module.exports = async (octo, sourceRepo, destRepo, sourceReleaseId, destReleaseId) => {
  const gitHubKey = process.env.GITHUB_TOKEN;

  if (!gitHubKey) {
    throw new Error("GITHUB_TOKEN is not set in environment variables.");
  }

  // Get the source release details
  const [sourceOwner, sourceRepoName] = sourceRepo.split("/");
  const { data: sourceRelease } = await octo.rest.repos.getRelease({
    owner: sourceOwner,
    repo: sourceRepoName,
    release_id: sourceReleaseId,
  });

  // Prepare to copy assets
  const [destOwner, destRepoName] = destRepo.split("/");

  const assetPromises = sourceRelease.assets.map(async (asset) => {
    try {
      console.log(`Processing asset: ${asset.name}`);

      // Use `browser_download_url` for downloading assets
      const response = await fetch(asset.browser_download_url, {
        headers: {
          Accept: "application/octet-stream",
          Authorization: `Bearer ${gitHubKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download asset ${asset.name}: ${response.statusText}`);
      }

      const assetData = await response.arrayBuffer();

      // Upload the asset to the destination release
      await octo.rest.repos.uploadReleaseAsset({
        owner: destOwner,
        repo: destRepoName,
        release_id: destReleaseId,
        name: asset.name,
        label: asset.label || undefined, // Label is optional
        data: Buffer.from(assetData), // Convert ArrayBuffer to Buffer
        headers: {
          "content-length": asset.size,
          "content-type": asset.content_type || "application/octet-stream",
        },
      });

      console.log(`Successfully uploaded asset: ${asset.name}`);
    } catch (error) {
      console.error(`Failed to process asset ${asset.name}: ${error.message}`);
    }
  });

  // Wait for all assets to be processed
  await Promise.all(assetPromises);

  console.log("All assets processed.");
};
