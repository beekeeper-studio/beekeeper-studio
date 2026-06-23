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
  private maximizeOnShow = false
  private hadCachedState = false

  // The window is constructed from the fast window-state cache (the single source
  // of truth for geometry/zoom/maximized) so it can show before the settings DB is
  // ready. Theme color and a one-time migration of legacy DB window settings are
  // reconciled via attachSettings() once the real settings load.
  constructor(openOptions: OpenOptions) {
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
    })

    this.win.on('unmaximize', () => {
      this.win.webContents.send(`unmaximize-${this.sId}`)
      saveWindowState({ maximized: false })
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

  // Called once the settings DB has loaded. The window-state cache is the single
  // source of truth for geometry/zoom/maximized, so this only (1) refreshes the
  // cached frame color from the theme setting, and (2) performs a ONE-TIME migration
  // of legacy DB window settings into the cache on the first launch with no cache
  // (e.g. upgrading from a version that stored window state in the DB).
  attachSettings(settings: IGroupedUserSettings) {
    if (!this.win) return

    const dark = electron.nativeTheme.shouldUseDarkColors || settings.theme.value.toString().includes('dark')

    if (this.hadCachedState) {
      // Cache is authoritative; just keep the next launch's frame color current.
      saveWindowState({ dark })
      return
    }

    // No cache yet: seed it from the legacy DB window settings and apply them to
    // the window that was built from defaults a moment ago.
    const zoomLevel = Number(settings.zoomLevel?.value) || 0
    const maximized = !!settings.windowMaximized.value
    const pos = settings.windowPosition.value as Record<string, any>
    const bounds = (pos && typeof pos.x === "number" && typeof pos.y === "number")
      ? { x: pos.x, y: pos.y, width: pos.width, height: pos.height }
      : {}

    saveWindowState({ dark, zoomLevel, maximized, ...bounds })

    this.win.webContents.zoomLevel = zoomLevel
    if (typeof bounds.x === "number") this.win.setBounds(bounds as Electron.Rectangle)
    if (maximized && !this.win.isMaximized()) this.win.maximize()
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

// Build and show a window from the fast window-state cache. The window needs no
// settings to construct; at startup call attachSettings() on the returned window
// once the settings DB has loaded (for the theme color + one-time legacy migration).
export function buildWindow(options?: OpenOptions): BeekeeperWindow {
  const win = new BeekeeperWindow(options || {})
  windows.push(win)
  return win
}

export function getCurrentWindow(): BeekeeperWindow {
  return _.filter(windows, 'focused')[0]
}
