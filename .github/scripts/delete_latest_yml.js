
module.exports = async ({ github, context, core }, owner, repo, releaseId) => {
  const assetName = 'latest-mac.yml';

  async function findAssetIdByName(assets, name) {
    for (const asset of assets) {
      if (asset.name === name) {
        return asset.id;
      }
    }
    return null;
  }

  try {
    // Get the existing assets for the release
    const { data: assets } = await github.rest.repos.listReleaseAssets({
      owner: owner,
      repo: repo,
      release_id: releaseId,
    });

    // Check if the asset already exists and delete it if necessary
    const assetId = await findAssetIdByName(assets, assetName);
    if (assetId) {
      await github.rest.repos.deleteReleaseAsset({
        owner: owner,
        repo: repo,
        asset_id: assetId,
      });
      core.info(`Deleted existing asset: ${assetName}`);
    } else {
      core.info(`No existing asset found with name: ${assetName}`);
    }
  } catch (error) {
    core.error('Error deleting asset:', error);
    core.setFailed(`Action failed with error ${error}`);
  }
};
