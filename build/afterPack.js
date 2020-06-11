// This file is (mostly) Copyright Cozy Labs
// taken from https://github.com/cozy-labs/cozy-desktop
const path = require('path')
const fs = require('fs')
const util = require('util')

const renameAsync = util.promisify(fs.rename)
const unlinkAsync = util.promisify(fs.unlink)

module.exports = async function (context) {
  // Replace the app launcher on linux only.
  if (process.platform !== 'linux') {
    return
  }
  // eslint-disable-next-line no-console
  console.log('afterPack hook triggered', context)

  const executableName = context.packager.executableName
  const sourceExecutable = path.join(context.appOutDir, executableName)
  const targetExecutable = path.join(context.appOutDir, `${executableName}-bin`)
  const launcherScript = path.join(
    context.appOutDir,
    'resources',
    'launcher-script.sh'
  )
  // rename beekeeper-studio to beekeeper-studio-bin
  await renameAsync(sourceExecutable, targetExecutable)
  // rename launcher script to beekeeper-studio
  await renameAsync(launcherScript, sourceExecutable)
}
