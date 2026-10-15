// electron-builder `msiProjectCreated` hook. Runs after the MSI target writes
// its WiX project (project.wxs) to disk, before candle/light compile it.
//
// Adds a marker file to the root of the install directory. The app checks for
// it at startup (see src/common/msiInstall.ts) to tell an MSI install apart
// from the NSIS and portable builds. MSI installs are managed by IT, so the
// built-in updater is turned off for them: it would otherwise run the NSIS
// installer and leave a second, per-user copy next to the managed one.
const fs = require('fs')
const path = require('path')

// Keep in sync with MSI_MARKER_FILE in src/common/msiInstall.ts
const MARKER_FILE = 'msi-install.txt'

const MARKER_CONTENTS = [
  'This copy of Beekeeper Studio was installed from the Windows Installer (MSI) package.',
  'Automatic updates are disabled. To upgrade, deploy a newer MSI.',
  'Do not delete this file.',
  ''
].join('\r\n')

const COMPONENT_GROUP = '<ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">'

function addMarkerComponent(wxs) {
  if (wxs.includes(`Name="${MARKER_FILE}"`)) return wxs

  const start = wxs.indexOf(COMPONENT_GROUP)
  if (start === -1) {
    throw new Error(`msiProjectCreated: "${COMPONENT_GROUP}" not found in the WiX project. Has the electron-builder MSI template changed?`)
  }
  const end = wxs.indexOf('</ComponentGroup>', start)
  if (end === -1) {
    throw new Error('msiProjectCreated: closing </ComponentGroup> not found in the WiX project.')
  }

  // The Source is relative: candle and light run with the project's directory
  // as their working directory, which works on Windows and under Wine alike.
  const component = [
    '  <Component>',
    `        <File Id="bksMsiInstallMarker" Name="${MARKER_FILE}" Source="${MARKER_FILE}" ReadOnly="yes" KeyPath="yes"/>`,
    '      </Component>',
    '    '
  ].join('\n')

  return wxs.slice(0, end) + component + wxs.slice(end)
}

exports.MARKER_FILE = MARKER_FILE
exports.addMarkerComponent = addMarkerComponent

exports.default = async function msiProjectCreated(projectFile) {
  fs.writeFileSync(path.join(path.dirname(projectFile), MARKER_FILE), MARKER_CONTENTS)
  const wxs = fs.readFileSync(projectFile, 'utf8')
  fs.writeFileSync(projectFile, addMarkerComponent(wxs))
}
