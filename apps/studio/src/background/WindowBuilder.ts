import _ from 'lodash'
import path from 'path'
import { BrowserWindow, globalShortcut, ipcMain, Rectangle } from "electron"
import electron from 'electron'
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import querystring from 'query-string'
import { safeOpenExternal } from './lib/electron/safeOpenExternal'
import { AppEvent } from '../common/AppEvent'


// eslint-disable-next-line
const remoteMain = require('@electron/remote/main')

const log = rawLog.scope('WindowBuilder')

const windows: BeekeeperWindow[] = []

// How long to wait for the renderer to answer a close-confirmation request
// (e.g. it never mounted a listener, or the page hung) before closing the
// window anyway. A window must never become unclosable.
const CLOSE_CONFIRMATION_TIMEOUT_MS = 5000

// Set right before a flow that must not be interrupted by the unsaved-changes
// prompt, e.g. installing an auto-update. Affects every window.
let closeConfirmationBypassed = false

export function bypassCloseConfirmation(): void {
  closeConfirmationBypassed = true
}

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
  // Set once the renderer has confirmed it's fine to close, so the 'close'
  // handler lets the next close attempt through instead of asking again.
  private closeConfirmed = false
  // Set while a close confirmation is in flight, so a second close attempt
  // (e.g. a double-click on the close button) waits on the same request
  // instead of starting a competing one.
  private pendingCloseConfirmation: Promise<boolean> | null = null

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
    this.win?.on('close', this.closeListener.bind(this))


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

  // Handles both the custom-titlebar close button (via closeWindow(), which
  // calls win.close() and ends up here too) and OS-level close (Alt+F4,
  // Cmd+Q / File > Quit, taskbar close). For Cmd+Q and window-all-closed,
  // Electron calls this once per open window; each window is asked about its
  // own unsaved changes independently, and declining just cancels that one
  // window's close (and therefore the overall quit).
  private closeListener(event: electron.Event) {
    if (this.closeConfirmed || closeConfirmationBypassed) return

    event.preventDefault()
    // A double-click on the close button, or two close triggers firing close
    // together (e.g. the custom titlebar button and an OS shortcut), must
    // share one confirmation instead of racing two dialogs / two sets of
    // IPC listeners against each other.
    if (!this.pendingCloseConfirmation) {
      this.pendingCloseConfirmation = this.requestCloseConfirmation()
        .finally(() => { this.pendingCloseConfirmation = null })
    }
    this.pendingCloseConfirmation
      .then((confirmed) => {
        if (!confirmed) return
        this.closeConfirmed = true
        this.win?.close()
      })
      .catch((ex) => log.error('close confirmation failed, closing anyway', ex))
  }

  private requestCloseConfirmation(): Promise<boolean> {
    const webContents = this.webContents
    if (!webContents || webContents.isDestroyed()) return Promise.resolve(true)

    return new Promise((resolve) => {
      let settled = false
      const finish = (confirmed: boolean) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        ipcMain.removeListener(AppEvent.confirmWindowCloseAck, onAck)
        ipcMain.removeListener(AppEvent.confirmWindowCloseResponse, onResponse)
        webContents.removeListener('destroyed', onRendererGone)
        webContents.removeListener('render-process-gone', onRendererGone)
        webContents.removeListener('did-navigate', onNavigated)
        webContents.removeListener('unresponsive', onUnresponsive)
        resolve(confirmed)
      }
      const onAck = (event: electron.IpcMainEvent) => {
        if (event.sender !== webContents) return
        // The renderer is alive and about to show its own dialog (or
        // answer right away). From here on, only that dialog decides - a
        // user who takes a while on it must not have the window closed out
        // from under them, so the fallback timeout is dropped entirely
        // rather than merely extended.
        clearTimeout(timer)
      }
      const onResponse = (event: electron.IpcMainEvent, confirmed: boolean) => {
        if (event.sender !== webContents) return
        finish(!!confirmed)
      }
      // If the renderer dies after acknowledging (crash, or the process is
      // torn down some other way) there is no dialog left to wait for - the
      // only way out is to let the close proceed, otherwise this window
      // would stay stuck forever with its close prevented and nothing left
      // that could ever answer.
      const onRendererGone = () => {
        log.warn('renderer gone while waiting for close confirmation, closing anyway')
        finish(true)
      }
      // A reload (or a full navigation to a different URL) while a
      // confirmation is in flight tears down the page that was going to
      // answer - e.g. the dev "reload" AppEvents, or a user-triggered
      // refresh mid-dialog. Nothing will ever call
      // respondConfirmWindowClose for this request once that happens, so
      // treat it the same as the renderer being gone. 'did-navigate' (unlike
      // 'did-start-navigation') only fires once a main-frame, cross-document
      // navigation has actually committed - it already excludes sub-frame
      // navigations (e.g. a plugin's iframe), same-document ones (hash
      // changes, pushState) and navigations that got cancelled before
      // committing, so none of those wrongly orphan a live dialog.
      const onNavigated = () => {
        log.warn('renderer navigated away while waiting for close confirmation, closing anyway')
        finish(true)
      }
      // Covers a renderer whose main thread hangs (e.g. stuck in a
      // synchronous loop) without crashing outright - 'destroyed' /
      // 'render-process-gone' don't fire for that. This only fires for a
      // genuinely blocked main thread, not for a page merely awaiting the
      // user's click on the confirmation dialog, so it never cuts off a
      // dialog someone is still looking at.
      const onUnresponsive = () => {
        log.warn('renderer unresponsive while waiting for close confirmation, closing anyway')
        finish(true)
      }

      ipcMain.on(AppEvent.confirmWindowCloseAck, onAck)
      ipcMain.on(AppEvent.confirmWindowCloseResponse, onResponse)
      webContents.once('destroyed', onRendererGone)
      webContents.once('did-navigate', onNavigated)
      webContents.once('render-process-gone', onRendererGone)
      webContents.once('unresponsive', onUnresponsive)
      // Only guards against a renderer that never even acknowledges the
      // request - no listener yet (e.g. still on the connection screen,
      // before CoreTabs mounts), or a crashed/hung page. Once acknowledged,
      // there is no timeout: see onAck.
      const timer = setTimeout(() => {
        log.warn('no close confirmation ack in time, closing anyway')
        finish(true)
      }, CLOSE_CONFIRMATION_TIMEOUT_MS)

      try {
        webContents.send(AppEvent.confirmWindowClose)
      } catch (ex) {
        log.error('failed to request close confirmation, closing anyway', ex)
        finish(true)
      }
    })
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
