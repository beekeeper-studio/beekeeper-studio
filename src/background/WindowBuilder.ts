import _ from 'lodash'
import path from 'path'
import { BrowserWindow } from "electron"
import electron from 'electron'
import { createProtocol } from "vue-cli-plugin-electron-builder/lib"
import platformInfo from '../common/platform_info'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import AppEvent from 'common/AppEvent'
import rawLog from 'electron-log'

const log = rawLog.scope('WindowBuilder')

const windows: BeekeeperWindow[] = []

function getIcon() {
  return path.resolve(path.join(__dirname, '..', `public/icons/png/512x512.png`))
}

class BeekeeperWindow {
  private active = true
  private win: Nullable<BrowserWindow>
  private actionHandler: NativeMenuActionHandlers
  private reloaded = false

  constructor(private settings: IGroupedUserSettings) {
    const theme = settings.theme
    const showFrame = settings.menuStyle && settings.menuStyle.value == 'native' ? true : false
    this.actionHandler = new NativeMenuActionHandlers(this.settings)
    log.info('constructing the window')
    this.win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: theme.value === 'dark' ? "#252525" : '#ffffff',
      titleBarStyle: 'hidden',
      frame: showFrame,
      webPreferences: {
        enableRemoteModule: true,
        nodeIntegration: Boolean(process.env.ELECTRON_NODE_INTEGRATION),
        contextIsolation: false
      },
      icon: getIcon()
    })

    const runningInWebpack = !!process.env.WEBPACK_DEV_SERVER_URL
    const appUrl = process.env.WEBPACK_DEV_SERVER_URL || 'app://./index.html'

    this.win.webContents.zoomLevel = Number(settings.zoomLevel?.value) || 0
    if (!runningInWebpack) {
      createProtocol('app')
    }
    this.win.loadURL(appUrl)
    if ((platformInfo.env.development && !platformInfo.env.test) || platformInfo.debugEnabled) {
      this.win.webContents.openDevTools()
    }

    this.initializeCallbacks()
    this.win.webContents.on('will-navigate', (e, url) => {
      if (url === appUrl) return // this is good
      log.info("navigate to", url)
      e.preventDefault()
      electron.shell.openExternal(url);
    })
  }

  get webContents() {
    return this.win ? this.win.webContents : null
  }

  send(channel: string) {
    this.win?.webContents.send(channel)
  }

  initializeCallbacks() {
    if (process.env.WEBPACK_DEV_SERVER_URL && platformInfo.isWindows) {
      // this.win?.webContents.on('did-finish-load', this.finishLoadListener.bind(this))
    }
    this.win?.on('closed', () => {
      this.win = null
      this.active = false
    })
  }

  finishLoadListener() {
    if(!this.reloaded) {
      this.win?.webContents.reload()
    }
    this.reloaded = true
  }

}

export function getActiveWindows() {
  return _.filter(windows, 'active')
}

export function buildWindow(settings: IGroupedUserSettings) {
  windows.push(new BeekeeperWindow(settings))
}
