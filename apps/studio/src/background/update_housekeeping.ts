import { promises as fs } from 'fs'
import path from 'path'
import semver from 'semver'

// electron-updater and Squirrel.Mac both leave files behind after an update is
// installed. electron-updater only empties its `pending` folder when it starts
// downloading a *different* update, so the last installer (hundreds of MB)
// stays on disk indefinitely, and forever if update checks are later turned
// off.
//
// Squirrel.Mac's ShipIt runs as root when installing into /Applications, which
// leaves root-owned log files it can't reopen later. Each install then writes
// to the next free ShipIt_stdout.log.N, nothing deletes the old ones, and once
// N reaches 100 updates stop applying
// (https://github.com/Squirrel/Squirrel.Mac/issues/322). Deleting the logs
// resets the numbering. ShipIt can also leave staged app bundles behind when
// an install is interrupted.

interface Logger {
  info(...args: any[]): void
  warn(...args: any[]): void
}

export interface UpdateHousekeepingOptions {
  // electron-updater cache, e.g. ~/Library/Caches/beekeeper-studio-updater
  updaterCacheDir?: string
  // Squirrel.Mac cache, e.g. ~/Library/Caches/io.beekeeperstudio.desktop.ShipIt
  shipItCacheDir?: string
  currentVersion: string
  // false when update checks are turned off, so nothing will reuse the cache
  updatesEnabled: boolean
  log: Logger
}

const VERSION_IN_FILENAME = /\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)(?:\.\d+)*)?/
const TEMP_DOWNLOAD = /^(\d+-)?temp-/
const SHIPIT_LOG = /^ShipIt_std(out|err)\.log(\.\d+)?$/
const STAGED_SHIPIT_BUNDLE = /^update\./

export function versionFromFileName(fileName: string): string | null {
  const match = fileName.match(VERSION_IN_FILENAME)
  return match && semver.valid(match[0]) ? match[0] : null
}

async function readDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

async function remove(target: string, log: Logger): Promise<void> {
  try {
    await fs.rm(target, { recursive: true, force: true })
    log.info(`removed ${target}`)
  } catch (e) {
    log.warn(`could not remove ${target}: ${e.message}`)
  }
}

async function pendingUpdateVersion(pendingDir: string, entries: string[]): Promise<string | null> {
  try {
    const info = JSON.parse(await fs.readFile(path.join(pendingDir, 'update-info.json'), 'utf8'))
    const version = info?.fileName && versionFromFileName(info.fileName)
    if (version) return version
  } catch {
    // no update-info.json; fall back to the downloaded file names
  }
  const versions = entries.map(versionFromFileName).filter(Boolean)
  return versions.length ? semver.rsort(versions)[0] : null
}

async function cleanUpdaterCache(opts: UpdateHousekeepingOptions): Promise<void> {
  const { updaterCacheDir, currentVersion, updatesEnabled, log } = opts

  if (!updatesEnabled) {
    if ((await readDir(updaterCacheDir)).length) await remove(updaterCacheDir, log)
    return
  }

  const pendingDir = path.join(updaterCacheDir, 'pending')
  const entries = await readDir(pendingDir)
  if (!entries.length) return

  // No download runs before startup housekeeping finishes, so any temp file is
  // left over from a download that was interrupted.
  for (const entry of entries.filter((e) => TEMP_DOWNLOAD.test(e))) {
    await remove(path.join(pendingDir, entry), log)
  }

  const pendingVersion = await pendingUpdateVersion(pendingDir, entries)
  if (pendingVersion && semver.valid(currentVersion) && semver.lte(pendingVersion, currentVersion)) {
    log.info(`pending update ${pendingVersion} is already installed (running ${currentVersion})`)
    await remove(pendingDir, log)
  }
}

async function cleanShipItCache(shipItCacheDir: string, log: Logger): Promise<void> {
  const entries = await readDir(shipItCacheDir)
  if (!entries.length) return

  // ShipIt records the bundle it is about to install (as JSON, despite the
  // extension). Leave that one alone in case an install is still in flight;
  // anything else is an orphan. Without a readable state file there is no way
  // to tell, so bundles are kept.
  let activeBundle: string | null | undefined
  try {
    const state = JSON.parse(await fs.readFile(path.join(shipItCacheDir, 'ShipItState.plist'), 'utf8'))
    const bundlePath = decodeURIComponent(new URL(state.updateBundleURL).pathname)
    activeBundle = path.relative(shipItCacheDir, bundlePath).split(path.sep)[0]
  } catch (e) {
    if (e.code === 'ENOENT') activeBundle = null
  }

  for (const entry of entries) {
    const orphanBundle = activeBundle !== undefined && STAGED_SHIPIT_BUNDLE.test(entry) && entry !== activeBundle
    if (orphanBundle || SHIPIT_LOG.test(entry)) {
      await remove(path.join(shipItCacheDir, entry), log)
    }
  }
}

export async function cleanUpUpdateFiles(opts: UpdateHousekeepingOptions): Promise<void> {
  try {
    if (opts.updaterCacheDir) await cleanUpdaterCache(opts)
    if (opts.shipItCacheDir) await cleanShipItCache(opts.shipItCacheDir, opts.log)
  } catch (e) {
    opts.log.warn(`update housekeeping failed: ${e.message}`)
  }
}
