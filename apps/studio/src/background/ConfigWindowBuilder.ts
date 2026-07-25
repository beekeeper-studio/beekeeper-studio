import path from 'path'
import { BrowserWindow, globalShortcut } from "electron"
import electron from 'electron'
import platformInfo from '../common/platform_info'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import rawLog from '@bksLogger'
import querystring from 'query-string'

// eslint-disable-next-line
const remoteMain = require('@electron/remote/main')

const log = rawLog.scope('ConfigWindowBuilder')

// Only ever one config editor. Opening it again focuses what's already there,
// so two windows can't fight over the same file.
let configWindow: BrowserWindow | null = null

function getIcon() {
  return path.resolve(path.join(__dirname, '..', `public/icons/png/512x512.png`))
}

/**
 * Open the config editor, or focus it if it is already open.
 *
 * Deliberately not a `BeekeeperWindow`: this window must not participate in the
 * windowPosition / windowMaximized settings that the main windows persist, and
 * it has no connection or tab state of its own.
 */
export function buildConfigWindow(settings: IGroupedUserSettings): BrowserWindow {
  if (configWindow && !configWindow.isDestroyed()) {
    if (configWindow.isMinimized()) configWindow.restore()
    configWindow.focus()
    return configWindow
  }

  const theme = settings.theme
  const dark = electron.nativeTheme.shouldUseDarkColors || theme.value.toString().includes('dark')
  let titleBarStyle: 'default' | 'hidden' = platformInfo.isWindows ? 'default' : 'hidden'

  if (platformInfo.isWayland) {
    titleBarStyle = 'hidden'
  }

  log.info('constructing the config window')

  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 450,
    title: 'Beekeeper Studio Config',
    backgroundColor: dark ? "#252525" : '#ffffff',
    titleBarStyle,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      sandbox: false,
    },
    icon: getIcon(),
    show: false,
  })

  configWindow = win

  // The config window skips store initialization, so it has no route to the
  // settings table. The theme it should render in comes along in the URL.
  const queryObj: Record<string, unknown> = {
    mode: 'config',
    theme: theme.value.toString(),
  }
  if (platformInfo.isWayland) {
    queryObj.runningWayland = true
  }

  const devUrl = 'http://localhost:3003'
  const startUrl = 'app://./index.html'
  const appUrl = platformInfo.isDevelopment ? devUrl : startUrl
  const url = `${appUrl}?${querystring.stringify(queryObj)}`

  remoteMain.enable(win.webContents)
  win.webContents.zoomLevel = Number(settings.zoomLevel?.value) || 0

  // Nothing in this window should ever navigate away or spawn a window.
  win.webContents.on('will-navigate', (e, target) => {
    if (target === url) return
    e.preventDefault()
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  win.on('closed', () => {
    configWindow = null
  })

  win.show()

  win.loadURL(url)
    .then(() => {
      if ((platformInfo.env.development && !platformInfo.env.test) || platformInfo.debugEnabled) {
        globalShortcut.register('F12', win.webContents.toggleDevTools.bind(win.webContents))
        win.webContents.openDevTools()
      }
    })
    .catch((ex) => log.error("CONFIG WINDOW LOAD ERROR", ex))

  return win
}
