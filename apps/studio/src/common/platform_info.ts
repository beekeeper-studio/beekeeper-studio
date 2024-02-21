import * as path from 'path'
import yargs from 'yargs-parser'

let p, e

function isRenderer() {
  // running in a web browser
  if (typeof process === 'undefined') return true

  // node-integration is disabled
  if (!process) return true

  // We're in node.js somehow
  if (!process.type) return false

  return process.type === 'renderer'
}

if (isRenderer()) {
  e = require('@electron/remote')
  p = e.process
} else {
  e = require('electron')
  p = process
}


const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
const testMode = p.env.TEST_MODE ? true : false
const isDevEnv = !(e.app && e.app.isPackaged);
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const isArm = p.arch.startsWith('arm')
const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')
const locale = e.app?.getLocale();
let windowPrefersDarkMode = false
if (isRenderer()) {
  windowPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
}
const updatesDisabled = !!p.env.BEEKEEPER_DISABLE_UPDATES

const oracleSupported = isMac && isArm ? false : true

let userDirectory =  testMode ? './tmp' : e.app.getPath("userData")
const downloadsDirectory = testMode ? './tmp' : e.app.getPath('downloads')
const homeDirectory = testMode ? './tmp' : e.app.getPath('home')
if (p.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(p.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}

const sessionType = p.env.XDG_SESSION_TYPE

const slice = isDevEnv ? 2 : 1
const parsedArgs = yargs(p.argv.slice(slice))
// TODO: Automatically enable wayland without flags once
// we're confident it will 'just work' for all Wayland users.
function isWaylandMode() {
  return parsedArgs['ozone-platform-hint'] === 'auto' &&
    sessionType === 'wayland' && !isWindows && !isMac
}

const platformInfo = {
  isWindows, isMac, isArm, oracleSupported,
  parsedArgs,
  isLinux: !isWindows && !isMac,
  sessionType,
  isWayland: isWaylandMode(),
  isSnap: p.env.ELECTRON_SNAP,
  isPortable: isWindows && p.env.PORTABLE_EXECUTABLE_DIR,
  isDevelopment: isDevEnv,
  isAppImage: p.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: p.env.NODE_ENV,
  resourcesPath: p.resourcesPath,
  env: {
    development: isDevEnv,
    test: testMode,
    production: !isDevEnv && !testMode && !p.env.WEBPACK_DEV_SERVER_URL
  },
  debugEnabled: !!p.env.DEBUG,
  DEBUG: p.env.DEBUG,
  platform: easyPlatform,
  darkMode: testMode? true : e.nativeTheme.shouldUseDarkColors || windowPrefersDarkMode,
  userDirectory,
  downloadsDirectory,
  homeDirectory,
  testMode,
  appDbPath: path.join(userDirectory, isDevEnv ? 'app-dev.db' : 'app.db'),
  updatesDisabled,
  appVersion: testMode ? 'test-mode' : e.app.getVersion(),
  cloudUrl: isDevEnv ? 'https://staging.beekeeperstudio.io' : 'https://app.beekeeperstudio.io',
  isCommunity: true,
  isUltimate: false,
  // cloudUrl: isDevEnv ? 'http://localhost:3000' : 'https://app.beekeeperstudio.io'
}

export default platformInfo
