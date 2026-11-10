// Removes the update file this build leg just uploaded (latest-mac.yml for
// mac builds, latest.yml for Windows builds) so finalize_update_yml can
// upload one that lists both arches. The name is the same on every channel:
// electron-builder only varies it for non-GitHub providers.
module.exports = async ({ github, core, context }, releaseId, assetName) => {
  const { owner, repo } = context.repo

  // The release holds more assets than one API page (30 by default) and the
  // update files sort last by name, so every page must be read or the file
  // is reported missing and the finalize upload fails with already_exists.
  const assets = await github.paginate(github.rest.repos.listReleaseAssets, {
    owner,
    repo,
    release_id: releaseId,
    per_page: 100,
  })

  const matches = assets.filter((asset) => asset.name === assetName)
  if (matches.length === 0) {
    core.info(`No existing asset found with name: ${assetName}`)
    return
  }
  for (const asset of matches) {
    await github.rest.repos.deleteReleaseAsset({ owner, repo, asset_id: asset.id })
    core.info(`Deleted existing asset: ${assetName} (id ${asset.id})`)
  }
}
