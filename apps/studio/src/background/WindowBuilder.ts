import _ from 'lodash'
import path from 'path'
import { BrowserWindow, globalShortcut, Rectangle } from "electron"
import electron from 'electron'
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import querystring from 'query-string'


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
  private appUrl: string
  public sId: string;

  constructor(protected settings: IGroupedUserSettings, openOptions: OpenOptions) {
    const theme = settings.theme
    const dark = electron.nativeTheme.shouldUseDarkColors || theme.value.toString().includes('dark')
    let titleBarStyle: 'default' | 'hidden' = platformInfo.isWindows ? 'default' : 'hidden'

    if (platformInfo.isWayland) {
      titleBarStyle = 'hidden'
    }

    log.info('constructing the window')
    const preloadPath = path.join(__dirname, 'preload.js')
    console.log("PRELOAD PATH:", preloadPath)
    this.win = new BrowserWindow({
      ...this.getWindowPosition(settings),
      minWidth: 800,
      minHeight: 600,
      backgroundColor: dark ? "#252525" : '#ffffff',
      titleBarStyle,
      frame: false,
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        spellcheck: false,
        sandbox: false,
      },
      icon: getIcon(),
      show: false,
    })

    const devUrl = 'http://localhost:3003'
    const startUrl = 'app://./index.html'
    const appUrl = platformInfo.isDevelopment ? devUrl : startUrl
    // const appUrl = startUrl
    const queryObj: any = openOptions ? { ...openOptions } : {}

    if (platformInfo.isWayland) {
      queryObj.runningWayland = true
    }
    const query = querystring.stringify(queryObj)

    this.appUrl = query ? `${appUrl}?${query}` : `${appUrl}/`
    remoteMain.enable(this.win.webContents)
    this.win.webContents.zoomLevel = Number(settings.zoomLevel?.value) || 0

    this.initializeCallbacks()
    this.win.webContents.on('will-navigate', (e, url) => {
      if (url === this.appUrl) return // this is good
      log.info("navigate to", url)
      e.preventDefault()
      const u = new URL(url)
      u.searchParams.append('ref', 'bks-app')
      electron.shell.openExternal(u.toString());
    })

    this.win.webContents.setWindowOpenHandler(({ url }) => {
      if (url === this.appUrl){
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

    this.win.on('maximize', () => {
      this.win.webContents.send(`maximize-${this.sId}`)
      this.settings.windowMaximized.value = true
      this.settings.windowMaximized.save().then(_.noop).catch(log.error)
    })

    this.win.on('unmaximize', () => {
      this.win.webContents.send(`unmaximize-${this.sId}`)
      this.settings.windowMaximized.value = false
      this.settings.windowMaximized.save().then(_.noop).catch(log.error)
    })

    this.win.on('enter-full-screen', () => {
      this.win.webContents.send(`enter-full-screen-${this.sId}`)
    })

    this.win.on('leave-full-screen', () => {
      this.win.webContents.send(`leave-full-screen-${this.sId}`)
    })

    this.initialize()
      .then(() => log.debug("initialize finished"))
      .catch((ex) => log.error("INITIALIZE ERROR", ex)  )
  }

  private async initialize() {
    // Install Vue Devtools
    // try {
    //   log.debug("installing vue devtools")
    //   installExtension({
    //       id: 'ljjemllljcmogpfapbkkighbhhppjdbg',
    //       electron: '>=1.2.1'
    //   })
    //   log.debug("devtools loaded", name)
    // } catch (e) {
    //   log.error('devtools failed to install:', e.toString())
    // }

    if (this.settings.windowMaximized.value) {
      this.win.maximize()
    }

    this.win.show()

    await this.win.loadURL(this.appUrl)
    if ((platformInfo.env.development && !platformInfo.env.test) || platformInfo.debugEnabled) {
      globalShortcut.register('F12', this.win.webContents.toggleDevTools.bind(this.win.webContents))
      globalShortcut.register('CommandOrControl+Shift+I', this.win.webContents.toggleDevTools.bind(this.win.webContents))

      this.win.webContents.openDevTools()
    }
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

  get winId() {
    return this.win ? this.win.id : null;
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

  onClose(listener: (event: electron.Event) => void) {
    this.win?.on('close', listener);
  }

  get active() {
    return !!this.win
  }

  get focused() {
    return !!this.win && this.win.isFocused();
  }

  isMaximized() {
    return this.win?.isMaximized();
  }

  isFullscreen() {
    return this.win?.isFullScreen();
  }

  setFullscreen(value: boolean) {
    this.win?.setFullScreen(value);
  }

  minimizeWindow() {
    this.win?.minimize();
  }

  unmaximizeWindow() {
    this.win?.unmaximize();
  }

  maximizeWindow() {
    this.win?.maximize();
  }

  closeWindow() {
    this.win?.close();
  }
}

export function getActiveWindows(): BeekeeperWindow[] {
  return _.filter(windows, 'active')
}

export function buildWindow(settings: IGroupedUserSettings, options?: OpenOptions): void {
  windows.push(new BeekeeperWindow(settings, options || {}))
}

export function getCurrentWindow(): BeekeeperWindow {
  return _.filter(windows, 'focused')[0]
}
