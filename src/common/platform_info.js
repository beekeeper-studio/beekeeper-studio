import path from 'path'
import electron from 'electron'

const e = electron.remote ? electron.remote : electron
const p = electron.remote ? electron.remote.process : process
const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
const testMode = p.env.TEST_MODE ? true : false
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')
let windowPrefersDarkMode = false
if (electron.remote) {
  windowPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
}
const updatesDisabled = !!p.env.BEEKEEPER_DISABLE_UPDATES

let userDirectory =  testMode ? './' : e.app.getPath("userData")
if (p.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(p.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}
const platformInfo = {
  isWindows, isMac,
  isLinux: !isWindows && !isMac,
  isSnap: p.env.ELECTRON_SNAP,
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  debugEnabled: !!process.env.DEBUG,
  platform: easyPlatform,
  darkMode: e.nativeTheme.shouldUseDarkColors || windowPrefersDarkMode,
  userDirectory,
  testMode,
  appDbPath: path.join(userDirectory, 'app.db'),
  updatesDisabled
}

export default platformInfo