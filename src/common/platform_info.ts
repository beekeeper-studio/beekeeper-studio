import * as path from 'path'
import * as electron from 'electron'

const e = electron.remote ? electron.remote : electron
const p = electron.remote ? electron.remote.process : process
const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
const testMode = p.env.TEST_MODE ? true : false
const isDevEnv = !(e.app && e.app.isPackaged);
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')
let windowPrefersDarkMode = false
if (electron.remote) {
  windowPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
}
const updatesDisabled = !!p.env.BEEKEEPER_DISABLE_UPDATES

let userDirectory =  testMode ? './tmp' : e.app.getPath("userData")
const downloadsDirectory = testMode ? './tmp' : e.app.getPath('downloads')
const homeDirectory = testMode ? './tmp' : e.app.getPath('home')
if (p.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(p.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}
const platformInfo = {
  isWindows, isMac,
  isLinux: !isWindows && !isMac,
  isSnap: p.env.ELECTRON_SNAP,
  isPortable: isWindows && p.env.PORTABLE_EXECUTABLE_DIR,
  isDevelopment: isDevEnv,
  isAppImage: p.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  env: {
    development: isDevEnv,
    test: testMode,
    production: !isDevEnv && !testMode && !p.env.WEBPACK_DEV_SERVER_URL
  },
  debugEnabled: !!process.env.DEBUG,
  platform: easyPlatform,
  darkMode: testMode? true : e.nativeTheme.shouldUseDarkColors || windowPrefersDarkMode,
  userDirectory,
  downloadsDirectory,
  homeDirectory,
  testMode,
  appDbPath: path.join(userDirectory, isDevEnv ? 'app-dev.db' : 'app.db'),
  updatesDisabled,
  appVersion: testMode ? 'test-mode' : e.app.getVersion()
}

export default platformInfo
