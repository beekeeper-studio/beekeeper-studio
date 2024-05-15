import _ from 'lodash'
import path from 'path'
import { BrowserWindow, Rectangle } from "electron"
import electron from 'electron'
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from 'electron-log'
import querystring from 'query-string'
import url from 'url'


// eslint-disable-next-line
const remoteMain = require('@electron/remote/main')

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

  constructor(protected settings: IGroupedUserSettings, openOptions: OpenOptions) {
    const theme = settings.theme
    const dark = electron.nativeTheme.shouldUseDarkColors || theme.value.toString().includes('dark')
    let showFrame = settings.menuStyle && settings.menuStyle.value == 'native' ? true : false
    let titleBarStyle: 'default' | 'hidden' = platformInfo.isWindows && settings.menuStyle.value == 'native' ? 'default' : 'hidden'

    if (platformInfo.isWayland) {
      showFrame = false
      titleBarStyle = 'hidden'
    }

      log.info('constructing the window')
    this.win = new BrowserWindow({
      ...this.getWindowPosition(settings),
      minWidth: 800,
      minHeight: 600,
      backgroundColor: dark ? "#252525" : '#ffffff',
      titleBarStyle,
      frame: showFrame,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        spellcheck: false,
        sandbox: false,
      },
      icon: getIcon()
    })

    const startUrl = url.format({
      pathname: path.join(__dirname, './index.html'), // Adjust if your file is in a subdirectory within the asar
      protocol: 'file:',
      slashes: true
    });

    const devUrl = 'http://localhost:3003/src/index.html'

    // let appUrl = platformInfo.isDevelopment ? devUrl : startUrl
    let appUrl = startUrl
    const queryObj: any = openOptions ? { ...openOptions } : {}

    if (platformInfo.isWayland) {
      queryObj.runningWayland = true
    }

    const query = querystring.stringify(queryObj)

    appUrl = query ? `${appUrl}?${query}` : appUrl
    remoteMain.enable(this.win.webContents)
    this.win.webContents.zoomLevel = Number(settings.zoomLevel?.value) || 0
    this.win.loadURL(appUrl)
    if ((platformInfo.env.development && !platformInfo.env.test) || platformInfo.debugEnabled) {
      this.win.webContents.openDevTools()
    }

    this.initializeCallbacks()
    this.win.webContents.on('will-navigate', (e, url) => {
      if (url === appUrl) return // this is good
      log.info("navigate to", url)
      e.preventDefault()
      const u = new URL(url)
      u.searchParams.append('ref', 'bks-app')
      electron.shell.openExternal(u.toString());
    })

    this.win.webContents.setWindowOpenHandler(({ url }) => {
      if (url === appUrl){
        return {
          action: 'allow'
        }
      } else {
        return { action: 'deny' }
      }
    })

    this.win.webContents.on('ipc-message', (e, channel, ...args) => {
      if(channel === 'setWindowTitle') {
        this.win.setTitle(args[0])
        e.preventDefault()
      }
    })
  }

  private getWindowPosition(settings: IGroupedUserSettings) {
    const options: Electron.BrowserWindowConstructorOptions = {
      width: 1200,
      height: 800,
    }

    const isRectangle = (obj: any): obj is Rectangle => typeof obj === "object" &&
      typeof obj.x === "number" &&
      typeof obj.y === "number" &&
      typeof obj.width === "number" &&
      typeof obj.height === "number"

    const winPosition = settings.windowPosition.value as Record<string, any>
    if (isRectangle(winPosition)) {
      const area = electron.screen.getDisplayMatching(winPosition).workArea
      if (winPosition.x >= area.x &&
        winPosition.y >= area.y &&
        winPosition.x + winPosition.width <= area.x + area.width &&
        winPosition.y + winPosition.height <= area.y + area.height) {
        options.x = winPosition.x
        options.y = winPosition.y
      }
      if (winPosition.width <= area.width ||
        winPosition.height <= area.height) {
        options.width = winPosition.width
        options.height = winPosition.height
      }
    }
    return options
  }

  get webContents() {
    return this.win ? this.win.webContents : null
  }

  send(channel: string, ...args: any[]) {
    this.win?.webContents.send(channel, ...args)
  }

  initializeCallbacks() {
    if (platformInfo.isDevelopment && platformInfo.isWindows) {
      // this.win?.webContents.on('did-finish-load', this.finishLoadListener.bind(this))
    }
    this.win?.on('closed', () => {
      this.win = null
    })


    const windowMoveResizeListener = _.debounce(this.windowMoveResizeListener.bind(this), 1000)
    this.win.on('resize',windowMoveResizeListener)
    this.win.on('move', windowMoveResizeListener)
  }

  windowMoveResizeListener(){
    const bounds = this.win.getNormalBounds()
    this.settings.windowPosition.value = bounds
    this.settings.windowPosition.save().then(_.noop).catch(log.error)
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

export function getActiveWindows(): BeekeeperWindow[] {
  return _.filter(windows, 'active')
}

export function buildWindow(settings: IGroupedUserSettings, options?: OpenOptions): void {
  windows.push(new BeekeeperWindow(settings, options || {}))
}
