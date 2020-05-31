
import electron from 'electron'

const p = electron.remote ? electron.remote.process : process
const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
const isWindows = platform === 'win32'
const isMac = platform === 'darwin'

export default {
  isWindows, isMac,
  isLinux: !isWindows && !isMac,
  isSnap: p.env.ELECTRON_SNAP,
  sshAuthSock: p.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_END
}