import _ from 'lodash'
import path from 'path'
import { BrowserWindow, globalShortcut } from "electron"
import electron from 'electron'
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import querystring from 'query-string'
import { safeOpenExternal } from './lib/electron/safeOpenExternal'
import { readWindowState, saveWindowState, windowStateExisted, WindowState } from './windowState'


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

export class BeekeeperWindow {
  private win: BrowserWindow | null
  private reloaded = false
  private appUrl: string
  public sId: string;
  private settings: IGroupedUserSettings | null
  private maximizeOnShow = false
  private hadCachedState = false

  // settings is optional: the first window at startup is constructed from the
  // fast window-state cache BEFORE the settings DB is ready, then reconciled via
  // attachSettings() once the real settings load.
  constructor(openOptions: OpenOptions, settings?: IGroupedUserSettings) {
    this.settings = settings ?? null
    const state = readWindowState()
    this.hadCachedState = windowStateExisted()
    const dark = electron.nativeTheme.shouldUseDarkColors || state.dark
    this.maximizeOnShow = state.maximized
    let titleBarStyle: 'default' | 'hidden' = platformInfo.isWindows ? 'default' : 'hidden'

    if (platformInfo.isWayland) {
      titleBarStyle = 'hidden'
    }

    log.info('constructing the window')
    const preloadPath = path.join(__dirname, 'preload.js')
    console.log("PRELOAD PATH:", preloadPath)
    this.win = new BrowserWindow({
      ...this.getWindowPosition(state),
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
    this.win.webContents.zoomLevel = state.zoomLevel

    this.initializeCallbacks()
    this.win.webContents.on('will-navigate', (e, url) => {
      if (url === this.appUrl) return // this is good
      log.info("navigate to", url)
      e.preventDefault()
      let u: URL
      try {
        u = new URL(url)
      } catch {
        log.warn('will-navigate: ignoring invalid URL', url)
        return
      }
      u.searchParams.append('ref', 'bks-app')
      safeOpenExternal(u.toString());
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
      saveWindowState({ maximized: true })
      this.persistSetting('windowMaximized', true)
    })

    this.win.on('unmaximize', () => {
      this.win.webContents.send(`unmaximize-${this.sId}`)
      saveWindowState({ maximized: false })
      this.persistSetting('windowMaximized', false)
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

    if (this.maximizeOnShow) {
      this.win.maximize()
    }

    this.win.show()
    log.info(`window visible ${Math.round(process.uptime() * 1000)}ms after process start`)

    await this.win.loadURL(this.appUrl)
    log.info(`renderer loaded ${Math.round(process.uptime() * 1000)}ms after process start`)
    if ((platformInfo.env.development && !platformInfo.env.test) || platformInfo.debugEnabled) {
      globalShortcut.register('F12', this.win.webContents.toggleDevTools.bind(this.win.webContents))
      globalShortcut.register('CommandOrControl+Shift+I', this.win.webContents.toggleDevTools.bind(this.win.webContents))

      this.win.webContents.openDevTools()
    }
  }

  private getWindowPosition(state: WindowState) {
    const options: Electron.BrowserWindowConstructorOptions = {
      width: state.width || 1200,
      height: state.height || 800,
    }

    if (typeof state.x === "number" && typeof state.y === "number") {
      const rect = { x: state.x, y: state.y, width: options.width, height: options.height }
      const area = electron.screen.getDisplayMatching(rect).workArea
      if (rect.x >= area.x &&
        rect.y >= area.y &&
        rect.x + rect.width <= area.x + area.width &&
        rect.y + rect.height <= area.y + area.height) {
        options.x = state.x
        options.y = state.y
      }
    }
    return options
  }

  // Reconciles the window with the authoritative settings once the DB has loaded,
  // and refreshes the fast window-state cache so the next launch starts correct.
  attachSettings(settings: IGroupedUserSettings) {
    this.settings = settings
    if (!this.win) return

    const dark = electron.nativeTheme.shouldUseDarkColors || settings.theme.value.toString().includes('dark')
    const zoomLevel = Number(settings.zoomLevel?.value) || 0
    const maximized = !!settings.windowMaximized.value
    const pos = settings.windowPosition.value as Record<string, any>
    const bounds = (pos && typeof pos.x === "number" && typeof pos.y === "number")
      ? { x: pos.x, y: pos.y, width: pos.width, height: pos.height }
      : {}

    saveWindowState({ dark, zoomLevel, maximized, ...bounds })

    // If there was no cache yet (first launch after upgrade) the window was built
    // from defaults — reconcile it to the user's saved values now.
    if (!this.hadCachedState) {
      this.win.webContents.zoomLevel = zoomLevel
      if (typeof bounds.x === "number") this.win.setBounds(bounds as Electron.Rectangle)
      if (maximized && !this.win.isMaximized()) this.win.maximize()
    }
  }

  private persistSetting(key: 'windowMaximized' | 'windowPosition', value: any) {
    if (!this.settings) return
    this.settings[key].value = value
    this.settings[key].save().then(_.noop).catch(log.error)
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
    saveWindowState({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height })
    this.persistSetting('windowPosition', bounds)
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

export function buildWindow(settings: IGroupedUserSettings, options?: OpenOptions): BeekeeperWindow {
  const win = new BeekeeperWindow(options || {}, settings)
  windows.push(win)
  return win
}

// Build and show a window from the fast window-state cache, before the settings
// DB is ready. Call attachSettings() on the returned window once settings load.
export function buildBootstrapWindow(options?: OpenOptions): BeekeeperWindow {
  const win = new BeekeeperWindow(options || {})
  windows.push(win)
  return win
}

export function getCurrentWindow(): BeekeeperWindow {
  return _.filter(windows, 'focused')[0]
}
