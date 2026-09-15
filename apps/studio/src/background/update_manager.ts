import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getAppCacheDir } from 'electron-updater/out/AppAdapter'
import { readFileSync } from 'fs'
import path from 'path'
import { cleanUpUpdateFiles } from './update_housekeeping'
import { getActiveWindows } from './WindowBuilder'
import rawlog from '@bksLogger'

const log = rawlog.scope('update-manager')

import platformInfo from '../common/platform_info'
import BksConfig from '@/common/bksConfig'

autoUpdater.autoDownload = false
autoUpdater.logger = log

// HACK(mc, 2019-09-10): work around https://github.com/electron-userland/electron-builder/issues/4046
function dealWithAppImage() {
  if (platformInfo.isAppImageLauncher) {
    // remap temporary running AppImage to actual source
    // THIS IS PROBABLY SUPER BRITTLE AND MAKES ME WANT TO STOP USING APPIMAGE
    // eslint-disable-next-line
    // @ts-ignore
    autoUpdater.logger?.info('rewriting $APPIMAGE', {
      oldValue: process.env.APPIMAGE,
      newValue: process.env.ARGV0,
    })
    process.env.APPIMAGE = process.env.ARGV0
  } else {
    autoUpdater.logger?.info('Not running in AppImageLauncher')
  }
}

function shouldSkipUpdater() {
  if (platformInfo.isLinux && !platformInfo.isAppImage) return true
  return false
}

function checkForUpdates() {
  log.info('checking for updates right now')
  try {
    autoUpdater.checkForUpdates()
  } catch (error) {
    log.error(`Could not check for updates: ${error.message}`)
  }
}

function readResource(file: string, pattern: RegExp): string | null {
  try {
    const value = readFileSync(path.join(process.resourcesPath, file), 'utf8').match(pattern)?.[1]
    return value?.trim().replace(/^(['"])(.*)\1$/, '$2') || null
  } catch {
    return null
  }
}

function housekeepUpdateFiles(updatesEnabled: boolean): Promise<void> {
  // Portable and installed Windows builds share one updater cache, and a
  // portable build never downloads, so it leaves the cache to the installed one.
  const cacheDirName = readResource('app-update.yml', /^updaterCacheDirName:\s*(.+)$/m)
  const bundleId = platformInfo.isMac
    ? readResource(path.join('..', 'Info.plist'), /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/)
    : null
  return cleanUpUpdateFiles({
    updaterCacheDir: platformInfo.isPortable
      ? undefined
      : path.join(getAppCacheDir(), cacheDirName || 'beekeeper-studio-updater'),
    shipItCacheDir: bundleId ? path.join(getAppCacheDir(), `${bundleId}.ShipIt`) : undefined,
    currentVersion: app.getVersion(),
    updatesEnabled,
    log,
  })
}

export function setAllowBeta(allowBeta: boolean) {
  autoUpdater.allowPrerelease = allowBeta;
  autoUpdater.channel = allowBeta ? 'beta' : 'latest';
}

export function manageUpdates(allowBeta: boolean, debug?: boolean): void {

  if (platformInfo.environment === 'development' || platformInfo.isSnap || (platformInfo.isLinux && !platformInfo.isAppImage)) {
    log.info("not doing any updates, didn't meet conditional")
    return
  }

  if (BksConfig.general.checkForUpdatesDisabled) {
    log.info("automatic update checks are disabled")
    housekeepUpdateFiles(false)
    return
  }

  const housekeeping = housekeepUpdateFiles(true)

  setAllowBeta(allowBeta);

  dealWithAppImage();

  if (shouldSkipUpdater()) {
    log.info("Skipping auto-updater for this platform");
    return;
  }

  autoUpdater.logger?.debug?.(JSON.stringify(process.env))

  ipcMain.on('updater-ready', async () => {
    await housekeeping
    checkForUpdates()
    if (debug) {
      getActiveWindows().forEach(beeWin => beeWin.send('update-available'))
    }
  })

  autoUpdater.on('update-available', () => {
    const message = platformInfo.isPortable ? 'manual-update' : 'update-available'
    getActiveWindows().forEach(beeWin => beeWin.send(message))
  })

  ipcMain.on('download-update', async () => {
    await housekeeping
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-downloaded', () => {
    getActiveWindows().forEach(beeWin => beeWin.send('update-downloaded'))
  })

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  setInterval(() => {
    checkForUpdates()
  }, BksConfig.general.checkForUpdatesInterval)
}
