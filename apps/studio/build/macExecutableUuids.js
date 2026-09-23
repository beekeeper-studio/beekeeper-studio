// Gives the mac app's executables their own Mach-O UUIDs.
//
// electron-builder ships Electron's prebuilt executables unchanged, so every app on
// the same Electron version has the same LC_UUIDs. macOS Local Network privacy
// identifies apps by their main executable's UUID (Apple TN3179), so Beekeeper
// shared its Local Network permission, and its System Settings entry, with every
// other app on that Electron version (#4774, #4088).
//
// The new UUIDs are derived from the bundle ID, the executable's path in the bundle
// and its CPU type, so they stay the same across releases and Electron upgrades.
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const LC_UUID = 0x1b
const LC_CODE_SIGNATURE = 0x1d
const MH_MAGIC_64 = 0xfeedfacf
const FAT_MAGIC = 0xcafebabe
const FAT_MAGIC_64 = 0xcafebabf
// Namespace for the UUIDv5s below. Never change it: new UUIDs make macOS treat the
// app as a new program and ask for its permissions again.
const NAMESPACE = Buffer.from('27ddb799e4da48c2a8ae78b84dcf64de', 'hex')

function uuidV5(name) {
  const uuid = crypto.createHash('sha1').update(NAMESPACE).update(name).digest().subarray(0, 16)
  uuid[6] = (uuid[6] & 0x0f) | 0x50
  uuid[8] = (uuid[8] & 0x3f) | 0x80
  return uuid
}

function formatUuid(bytes) {
  const hex = bytes.toString('hex')
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

// Offsets of the Mach-O images in a thin or fat (universal) file
function sliceOffsets(buf) {
  const magic = buf.readUInt32BE(0)
  if (magic !== FAT_MAGIC && magic !== FAT_MAGIC_64) return [0]
  const entrySize = magic === FAT_MAGIC ? 20 : 32
  return Array.from({ length: buf.readUInt32BE(4) }, (_, i) => {
    const entry = 8 + i * entrySize
    return magic === FAT_MAGIC ? buf.readUInt32BE(entry + 8) : Number(buf.readBigUInt64BE(entry + 8))
  })
}

// Replaces the LC_UUID of every image in a Mach-O file. Returns what changed, and
// whether the file was code signed (the change invalidates that signature).
function setMachOUuids(file, seed) {
  const buf = fs.readFileSync(file)
  let signed = false
  const changes = sliceOffsets(buf).map((offset) => {
    if (buf.readUInt32LE(offset) !== MH_MAGIC_64) {
      throw new Error(`${file}: expected a 64-bit Mach-O image at offset ${offset}`)
    }
    const cpuType = buf.readUInt32LE(offset + 4)
    const commandCount = buf.readUInt32LE(offset + 16)
    let change = null
    let command = offset + 32
    for (let i = 0; i < commandCount; i++) {
      const type = buf.readUInt32LE(command)
      if (type === LC_CODE_SIGNATURE) signed = true
      if (type === LC_UUID) {
        const from = formatUuid(buf.subarray(command + 8, command + 24))
        const uuid = uuidV5(`${seed}/${cpuType.toString(16)}`)
        uuid.copy(buf, command + 8)
        change = { cpuType, from, to: formatUuid(uuid) }
      }
      command += buf.readUInt32LE(command + 4)
    }
    if (!change) throw new Error(`${file}: no LC_UUID load command`)
    return change
  })
  fs.writeFileSync(file, buf)
  return { changes, signed }
}

// The executable of each helper app, then the app's main executable. Helpers go
// first because signing the main executable signs the whole bundle, which needs
// its helpers to be signed already.
function macExecutables(appPath) {
  const executablesIn = (bundle) => {
    const dir = path.join(bundle, 'Contents', 'MacOS')
    return fs.readdirSync(dir).map((name) => path.join(dir, name))
  }
  const frameworks = path.join(appPath, 'Contents', 'Frameworks')
  const helpers = fs.readdirSync(frameworks)
    .filter((name) => name.endsWith('.app'))
    .flatMap((name) => executablesIn(path.join(frameworks, name)))
  return [...helpers, ...executablesIn(appPath)]
}

async function giveMacExecutablesOwnUuids(context) {
  const { appInfo } = context.packager
  const appPath = path.join(context.appOutDir, `${appInfo.productFilename}.app`)
  for (const file of macExecutables(appPath)) {
    const relativePath = path.relative(appPath, file)
    const { changes, signed } = setMachOUuids(file, `${appInfo.id}/${relativePath}`)
    for (const { cpuType, from, to } of changes) {
      // eslint-disable-next-line no-console
      console.log(`afterPack: ${relativePath} (cpu ${cpuType.toString(16)}) UUID ${from} -> ${to}`)
    }
    // Electron's arm64 executables come ad-hoc signed and its x64 ones unsigned.
    // Re-sign the ones the edit invalidated so unsigned builds still launch; signed
    // builds are signed again after afterPack anyway.
    if (signed && process.platform === 'darwin') {
      execFileSync('codesign', ['--force', '--sign', '-', file])
    }
  }
}

module.exports = { giveMacExecutablesOwnUuids }
