

/**
 * Create a draft release
 * @param {Object} options
 */
module.exports = async({github, core}, owner, repo, tagName) => {

  const releases = await github.rest.repos.listReleases({
    owner,
    repo
  });

  // NOTE(@day): for test releases
  tagName = tagName.replace('test', 'v');

  let uploadUrl;
  let assetsUrl;

  const draftRelease = releases.data.find(
    release => release.tag_name === tagName && release.draft
  );

  let finishedRelease = null
  if (draftRelease) {
    core.info(`Draft release with tag ${tagName} already exists.`);
    finishedRelease = { data: draftRelease }
  } else {
    const newRelease = await github.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: `Release ${tagName}`,
      body: 'Description of the release',
      draft: true,
      prerelease: false,
    });
    finishedRelease = newRelease
    core.info(`Draft release created with tag ${tagName}: ${newRelease.data.html_url}`);
  }
  core.setOutput('upload_url', finishedRelease.data.upload_url);
  core.setOutput('assets_url', finishedRelease.data.assets_url);
  core.setOutput('id', finishedRelease.data.id)
  core.setOutput('json', JSON.stringify(finishedRelease.data))

}
