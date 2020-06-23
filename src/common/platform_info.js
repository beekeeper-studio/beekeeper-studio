
import electron from 'electron'

const e = electron.remote ? electron.remote : electron
const p = electron.remote ? electron.remote.process : process
const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
const testMode = p.env.TEST_MODE ? true : false
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'
const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')

export default {
  isWindows, isMac,
  isLinux: !isWindows && !isMac,
  isSnap: p.env.ELECTRON_SNAP,
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_END,
  userDirectory: testMode ? './' : e.app.getPath('userData'),
  platform: easyPlatform,
  testMode
  
}