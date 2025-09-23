import yargs from 'yargs-parser'
import _ from 'lodash'
import { resolve, join } from 'path'
import { IPlatformInfo } from '../IPlatformInfo'
import { BksVersion } from '@/lib/license'

// TODO: Automatically enable wayland without flags once
// we're confident it will 'just work' for all Wayland users.
const p = process

export function resolveAppVersion(appVersion): BksVersion {
  const [major, minor, patch, channelVersion] = appVersion.split('.')

  if(!patch?.includes('-')) {
    // no -beta or -alpha
    return { major: Number(major), minor: Number(minor), patch: Number(patch), channel: 'stable' }
  }

  const [ realPatch, channel ] = patch.split('-')

  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(realPatch),
    channel,
    channelRelease: Number(channelVersion || 0)
  }

}


export function mainPlatformInfo(): IPlatformInfo {

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const e = require('electron')
  const platform = p.env.OS_OVERRIDE ? p.env.OS_OVERRIDE : p.platform
  const testMode = p.env.TEST_MODE ? true : false
  const isDevEnv = testMode ? false : !e.app.isPackaged;
  const isWindows = platform === 'win32'
  const isMac = platform === 'darwin'
  const isArm = p.arch.startsWith('arm')
  const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')
  const locale = testMode ? 'test' : e.app.getLocale();

  const windowPrefersDarkMode = false

  const updatesDisabled = !!p.env.BEEKEEPER_DISABLE_UPDATES

  // previous builds of Beekeeper Studio required native libs for Oracle,
  // but now it should work on all platforms
  // FIXME: Windows ARM - this needs to be disabled
  // as instant client not available there
  const oracleSupported = true

  const resourcesPath = isDevEnv ? resolve('./extra_resources') : resolve(p.resourcesPath)
  let userDirectory = testMode ? './tmp' : e.app.getPath("userData")
  const downloadsDirectory = testMode ? './tmp' : e.app.getPath('downloads')
  const homeDirectory = testMode ? './tmp' : e.app.getPath('home')
  if (p.env.PORTABLE_EXECUTABLE_DIR) {
    userDirectory = join(p.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
  }
  const pluginsDirectory = join(userDirectory, 'plugins')

  const sessionType = p.env.XDG_SESSION_TYPE

  const slice = isDevEnv ? 2 : 1
  const parsedArgs = yargs(p.argv.slice(slice))
  const appVersion = testMode ? '0.0.0' : e.app.getVersion()

  const parsedAppVersion = resolveAppVersion(appVersion)
  function isWaylandMode() {
    return parsedArgs['ozone-platform-hint'] === 'auto' &&
      sessionType === 'wayland' && !isWindows && !isMac
  }
   return {
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
    resourcesPath,
    env: {
      development: isDevEnv,
      test: testMode,
      production: !isDevEnv && !testMode
    },
    debugEnabled: !!p.env.DEBUG,
    DEBUG: p.env.DEBUG,
    platform: easyPlatform,
    darkMode: testMode ? true : !!(e.nativeTheme.shouldUseDarkColors) || windowPrefersDarkMode,
    userDirectory,
    downloadsDirectory,
    homeDirectory,
    pluginsDirectory,
    testMode,
    appDbPath: join(userDirectory, isDevEnv ? 'app-dev.db' : 'app.db'),
    updatesDisabled,
    appVersion,
    parsedAppVersion,
    // cloudUrl: isDevEnv ? 'https://staging.beekeeperstudio.io' : 'https://app.beekeeperstudio.io',
    // cloudUrl: 'https://app.beekeeperstudio.io',
    locale,

    cloudUrl: isDevEnv ? 'http://localhost:3000' : 'https://app.beekeeperstudio.io'
  }
}

