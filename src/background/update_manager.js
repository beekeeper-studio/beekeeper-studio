import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import globals from '../common/globals'
import { getActiveWindows } from './WindowBuilder'
import rawlog from 'electron-log'

const log = rawlog.scope('update-manager')

import platformInfo from '../common/platform_info'

autoUpdater.autoDownload = false
autoUpdater.logger = log

function dealWithAppImage() {
  if (platformInfo.isAppImage) {
    // remap temporary running AppImage to actual source
    // THIS IS PROBABLY SUPER BRITTLE AND MAKES ME WANT TO STOP USING APPIMAGE
    autoUpdater.logger.info('rewriting $APPIMAGE', {
      oldValue: process.env.APPIMAGE,
      newValue: process.env.ARGV0,
    })
    process.env.APPIMAGE = process.env.ARGV0
  } else {
    autoUpdater.logger.info('Not running in AppImageLauncher')
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

export function manageUpdates(debug) {

  if (platformInfo.environment === 'development' || platformInfo.isSnap || (platformInfo.isLinux && !platformInfo.isAppImage)) {
    log.info("not doing any updates, didn't meet conditional")
    return
  }
  dealWithAppImage();  

  autoUpdater.logger.debug(process.env)
  // HACK(mc, 2019-09-10): work around https://github.com/electron-userland/electron-builder/issues/4046

  ipcMain.on('updater-ready', () => {
    checkForUpdates()
    if (debug) {
      getActiveWindows().forEach(win => win.webContents.send('update-available'))
    }
  })

  autoUpdater.on('update-available', () => {
    getActiveWindows().forEach(win => win.webContents.send('update-available'))
  })

  ipcMain.on('download-update', () => {
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-downloaded', () => {
    getActiveWindows().forEach(win => win.webContents.send('update-downloaded'))
  })

  ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall()
  })

  setInterval(() => {
    checkForUpdates()
  }, globals.updateCheckInterval)
}