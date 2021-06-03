import _ from 'lodash'
import path from 'path'
import { BrowserWindow } from "electron"
import electron from 'electron'
import { createProtocol } from "vue-cli-plugin-electron-builder/lib"
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from 'electron-log'
import querystring from 'query-string'

const log = rawLog.scope('WindowBuilder')

const windows: BeekeeperWindow[] = []

export interface OpenOptions {
  url?: string
}

function getIcon() {
  return path.resolve(path.join(__dirname, '..', `public/icons/png/512x512.png`))
}

class BeekeeperWindow {
  private win: BrowserWindow | null
  private reloaded = false

  constructor(settings: IGroupedUserSettings, openOptions?: OpenOptions) {
    const theme = settings.theme
    const showFrame = settings.menuStyle && settings.menuStyle.value == 'native' ? true : false
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
    let appUrl = process.env.WEBPACK_DEV_SERVER_URL || 'app://./index.html'
    const query = openOptions ? querystring.stringify(openOptions) : null

    appUrl = query ? `${appUrl}?${query}` : appUrl

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

  send(channel: string, ...args: any[]) {
    this.win?.webContents.send(channel, ...args)
  }

  initializeCallbacks() {
    if (process.env.WEBPACK_DEV_SERVER_URL && platformInfo.isWindows) {
      // this.win?.webContents.on('did-finish-load', this.finishLoadListener.bind(this))
    }
    this.win?.on('closed', () => {
      this.win = null
    })
  }

  finishLoadListener() {
    if(!this.reloaded) {
      this.win?.webContents.reload()
    }
    this.reloaded = true
  }

  get active() {
    return !!this.win
  }

}

export function getActiveWindows() {
  return _.filter(windows, 'active')
}

export function buildWindow(settings: IGroupedUserSettings, options?: OpenOptions) {
  windows.push(new BeekeeperWindow(settings, options))
}
