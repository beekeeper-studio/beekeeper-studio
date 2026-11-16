// electron-builder `msiProjectCreated` hook. Runs after the MSI target writes
// its WiX project (project.wxs) to disk, before candle/light compile it.
//
// 1. Refuses to install without the Visual C++ Redistributable for the app's
// architecture. The DuckDB, libSQL and Snowflake drivers link against it. The
// NSIS installer downloads the runtime itself (msvc-redist.nsh), but an MSI
// can't run another installer, so IT installs it first, as with any MSI
// prerequisite.
//
// 2. Adds a marker file to the root of the install directory. The app checks for
// it at startup (see src/common/msiInstall.ts) to tell an MSI install apart
// from the NSIS and portable builds. MSI installs are managed by IT, so the
// app never downloads or installs updates for them (the NSIS installer it
// would run leaves a second, per-user copy next to the managed one). Users are
// told to contact their administrator instead.
//
// 3. ARM64 only: refuses to install on a PC that isn't ARM64. electron-builder's
// WiX can't target ARM64, so the ARM64 MSI is an x64 package that installs the
// ARM64 app, and Windows Installer would otherwise put it on x64 PCs, where it
// can't run.
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

// project.wxs is the MSI's file list: electron-builder writes one
// <Component><File .../></Component> entry per file of the packaged app into
// the ProductComponents group. This adds one more entry, for the marker, so
// the MSI installs it next to Beekeeper Studio.exe.
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

// Escape hatch for machines where the runtime is present but not registered:
// msiexec /i <file>.msi SKIP_VCREDIST_CHECK=1
const SKIP_VC_RUNTIME_PROPERTY = 'SKIP_VCREDIST_CHECK'

const VC_RUNTIMES = {
  x64: {
    property: 'BKS_VCRUNTIME_X64',
    key: 'SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64',
    message: 'Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). ' +
      'Install it from https://aka.ms/vc14/vc_redist.x64.exe, then run this installer again.',
  },
  arm64: {
    property: 'BKS_VCRUNTIME_ARM64',
    key: 'SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\ARM64',
    message: 'Beekeeper Studio requires the Microsoft Visual C++ Redistributable (ARM64). ' +
      'Install it from https://aka.ms/vc14/vc_redist.arm64.exe, then run this installer again.',
  },
}
const VC_RUNTIME_MESSAGE = VC_RUNTIMES.x64.message

function insertBeforeMajorUpgrade(wxs, lines) {
  const anchor = wxs.indexOf('<MajorUpgrade ')
  if (anchor === -1) {
    throw new Error('msiProjectCreated: <MajorUpgrade> not found in the WiX project. Has the electron-builder MSI template changed?')
  }
  return wxs.slice(0, anchor) + [...lines, '', '    '].join('\n') + wxs.slice(anchor)
}

// The redistributable sets Installed=1 under its Runtimes key. Both registry
// views are searched: the NSIS check reads the 32-bit one, but which view the
// runtime writes to isn't documented clearly. The skip property is Secure
// so it reaches the elevated part of the install. `Installed OR` keeps repair
// and uninstall working if the runtime is removed later.
function addVcRuntimeCheck(wxs, arch = 'x64') {
  const runtime = VC_RUNTIMES[arch]
  if (!runtime) throw new Error(`msiProjectCreated: no Visual C++ runtime check for ${arch}`)
  if (wxs.includes(`Id="${runtime.property}"`)) return wxs

  return insertBeforeMajorUpgrade(wxs, [
    `<Property Id="${runtime.property}">`,
    `      <RegistrySearch Id="bksVcRuntime64" Root="HKLM" Key="${runtime.key}" Name="Installed" Type="raw" Win64="yes"/>`,
    `      <RegistrySearch Id="bksVcRuntime32" Root="HKLM" Key="${runtime.key}" Name="Installed" Type="raw" Win64="no"/>`,
    '    </Property>',
    `    <Property Id="${SKIP_VC_RUNTIME_PROPERTY}" Secure="yes"/>`,
    `    <Condition Message="${runtime.message}"><![CDATA[Installed OR ${SKIP_VC_RUNTIME_PROPERTY} = "1" OR ${runtime.property} = "#1"]]></Condition>`,
  ])
}

const PROCESSOR_ARCHITECTURE_PROPERTY = 'BKS_PROCESSOR_ARCHITECTURE'
const ARM64_ONLY_MESSAGE = 'This installer is for Windows on ARM (ARM64) PCs. ' +
  'Use the x64 Beekeeper Studio MSI on this PC.'

// PROCESSOR_ARCHITECTURE in the machine environment is the native CPU (AMD64,
// ARM64), whichever architecture the reading process runs as. Win64="yes" is
// valid because the ARM64 MSI is an x64 package.
function addArm64OnlyCheck(wxs) {
  if (wxs.includes(`Id="${PROCESSOR_ARCHITECTURE_PROPERTY}"`)) return wxs

  return insertBeforeMajorUpgrade(wxs, [
    `<Property Id="${PROCESSOR_ARCHITECTURE_PROPERTY}">`,
    '      <RegistrySearch Id="bksProcessorArchitecture" Root="HKLM" Key="SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" Name="PROCESSOR_ARCHITECTURE" Type="raw" Win64="yes"/>',
    '    </Property>',
    `    <Condition Message="${ARM64_ONLY_MESSAGE}"><![CDATA[Installed OR ${PROCESSOR_ARCHITECTURE_PROPERTY} = "ARM64"]]></Condition>`,
  ])
}

// The hook only receives the project file. electron-builder writes it into a
// stage directory named after the target and arch: __msi-x64, __msi-arm64.
function archFromProjectFile(projectFile) {
  return /-arm64$/.test(path.basename(path.dirname(projectFile))) ? 'arm64' : 'x64'
}

exports.MARKER_FILE = MARKER_FILE
exports.VC_RUNTIMES = VC_RUNTIMES
exports.VC_RUNTIME_MESSAGE = VC_RUNTIME_MESSAGE
exports.SKIP_VC_RUNTIME_PROPERTY = SKIP_VC_RUNTIME_PROPERTY
exports.ARM64_ONLY_MESSAGE = ARM64_ONLY_MESSAGE
exports.addMarkerComponent = addMarkerComponent
exports.addVcRuntimeCheck = addVcRuntimeCheck
exports.addArm64OnlyCheck = addArm64OnlyCheck
exports.archFromProjectFile = archFromProjectFile

exports.default = async function msiProjectCreated(projectFile) {
  const arch = archFromProjectFile(projectFile)
  fs.writeFileSync(path.join(path.dirname(projectFile), MARKER_FILE), MARKER_CONTENTS)
  let wxs = addVcRuntimeCheck(addMarkerComponent(fs.readFileSync(projectFile, 'utf8')), arch)
  if (arch === 'arm64') wxs = addArm64OnlyCheck(wxs)
  fs.writeFileSync(projectFile, wxs)
}
