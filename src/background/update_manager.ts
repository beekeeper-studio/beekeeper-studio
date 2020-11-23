import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import globals from '../common/globals'
import { getActiveWindows } from './WindowBuilder'
import rawlog from 'electron-log'

const log = rawlog.scope('update-manager')

import platformInfo from '../common/platform_info'

autoUpdater.autoDownload = false
autoUpdater.logger = log

// HACK(mc, 2019-09-10): work around https://github.com/electron-userland/electron-builder/issues/4046
function dealWithAppImage() {
  if (platformInfo.isAppImage) {
    // remap temporary running AppImage to actual source
    // THIS IS PROBABLY SUPER BRITTLE AND MAKES ME WANT TO STOP USING APPIMAGE
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

function checkForUpdates() {
  log.info('checking for updates right now')
  try {
    autoUpdater.checkForUpdates()
  } catch (error) {
    log.error(`Could not check for updates: ${error.message}`)
  }
}

export function manageUpdates(debug?: boolean) {

  if (platformInfo.environment === 'development' || platformInfo.isSnap || (platformInfo.isLinux && !platformInfo.isAppImage)) {
    log.info("not doing any updates, didn't meet conditional")
    return
  }
  dealWithAppImage();

  autoUpdater.logger?.debug?.(JSON.stringify(process.env))

  ipcMain.on('updater-ready', () => {
    checkForUpdates()
    if (debug) {
      getActiveWindows().forEach(beeWin => beeWin.send('update-available'))
    }
  })

  autoUpdater.on('update-available', () => {
    const message = platformInfo.isPortable ? 'manual-update' : 'update-available'
    getActiveWindows().forEach(beeWin => beeWin.send(message))
  })

  ipcMain.on('download-update', () => {
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
  }, globals.updateCheckInterval)
}
