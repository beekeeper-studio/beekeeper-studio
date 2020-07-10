import _ from 'lodash'
import path from 'path'
import { BrowserWindow } from "electron"
import { createProtocol } from "vue-cli-plugin-electron-builder/lib"
import platformInfo from '../common/platform_info'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'

const windows = []


class BeekeeperWindow {
  active = true
  win = null
  actionHandler = null
  reloaded = false
  constructor(settings) {
    const theme = settings.theme
    const showFrame = settings.menuStyle && settings.menuStyle.value == 'native' ? true : false
    const iconPrefix = platformInfo.environment === 'development' ? 'public' : ''
    this.settings = settings
    this.actionHandler = new NativeMenuActionHandlers(this.settings)
    this.win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: theme.value === 'dark' ? "#000000" : '#ffffff',
      titleBarStyle: 'hidden',
      frame: showFrame,
      webPreferences: {
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      },
      icon: path.join(__dirname, `${iconPrefix}/icons/png/512x512.png`)
    })

    this.win.webContents.zoomLevel = settings.zoomLevel.value || 0

    if (process.env.WEBPACK_DEV_SERVER_URL) {
      // Load the url of the dev server if in development mode
      this.win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
      if (!process.env.IS_TEST) this.win.webContents.openDevTools();
    } else {
      createProtocol('app')
      // Load the index.html when not in development
      this.win.loadURL('app://./index.html')
      if (platformInfo.debugEnabled) this.win.webContents.openDevTools();
    }
    this.initializeCallbacks()
  }

  initializeCallbacks() {
    if (process.env.WEBPACK_DEV_SERVER_URL && platformInfo.isWindows) {
      this.win.webContents.on('did-finish-load', this.finishLoadListener.bind(this))
    }
    this.win.on('closed', () => {
      this.win = null
      this.active = false
    })
  }

  finishLoadListener() {
    if(!this.reloaded) {
      this.win.webContents.reload()
    }
    this.reloaded = true
  }

}

export function getActiveWindows() {
  return _.filter(windows, 'active')
}

export function buildWindow(settings) {
  windows.push(new BeekeeperWindow(settings))
}
