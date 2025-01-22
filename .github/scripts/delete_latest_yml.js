
module.exports = async ({ github, core }, assetsUrl, channel) => {
  // even though the main channel is also called 'latest', the name of this file
  // doesn't change.... I don't know why, it's all very confusing.
  const assetName = `latest-mac.yml`;

  async function findAssetByName(assets, name) {
    for (const asset of assets) {
      if (asset.name === name) {
        return asset;
      }
    }
    return null;
  }

  try {
    // Get the existing assets for the release using the assetsUrl
    const { data: assets } = await github.request({
      method: 'GET',
      url: assetsUrl,
      headers: {
        accept: 'application/vnd.github.v3+json',
      },
    });

    // Check if the asset already exists and delete it if necessary
    const asset = await findAssetByName(assets, assetName);
    if (asset) {
      await github.request({
        method: 'DELETE',
        url: asset.url,
        headers: {
          accept: 'application/vnd.github.v3+json',
        },
      });
      core.info(`Deleted existing asset: ${assetName}`);
    } else {
      core.info(`No existing asset found with name: ${assetName}`);
    }
  } catch (error) {
    core.error(`Error deleting asset: ${error.message}`);
    core.setFailed(`Action failed with error ${error.message}`);
  }
};
