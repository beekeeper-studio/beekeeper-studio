// This file should only be included in background.ts

const electron = require('electron');
import yargs from 'yargs-parser'
import path from 'path';
import { IPlatformInfo } from './IPlatformInfo';

const isDevEnv = !(electron?.app && electron?.app.isPackaged);
const slice = isDevEnv ? 2 : 1;
const parsedArgs = yargs(process.argv.slice(slice));
// TODO: Automatically enable wayland without flags once
// we're confident it will 'just work' for all Wayland users.
function isWaylandMode() {
  return parsedArgs['ozone-platform-hint'] === 'auto' &&
    sessionType === 'wayland' && !isWindows && !isMac
}

const platform = process.env.OS_OVERRIDE ? process.env.OS_OVERRIDE : process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isArm = process.arch.startsWith('arm');
const sessionType = process.env.XDG_SESSION_TYPE;
const resourcesPath = isDevEnv ? path.resolve('./extra_resources') : path.resolve(process.resourcesPath);
const testMode = process.env.TEST_MODE ? true : false;
const easyPlatform = isWindows ? 'windows' : (isMac ? 'mac' : 'linux')
// can't do this in the main process
// const windowPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
let userDirectory =  testMode ? './tmp' : electron?.app.getPath("userData")
const downloadsDirectory = testMode ? './tmp' : electron?.app.getPath('downloads')
const homeDirectory = testMode ? './tmp' : electron?.app.getPath('home')
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}
const updatesDisabled = !!process.env.BEEKEEPER_DISABLE_UPDATES
const locale = electron?.app?.getLocale() ?? process.env.locale;


const platformInfo: IPlatformInfo = {
  isWindows, isMac, isArm,
  oracleSupported: isMac && isArm ? false : true,
  parsedArgs,
  isLinux: !isWindows && !isMac,
  sessionType,
  isWayland: isWaylandMode(),
  isSnap: process.env.ELECTRON_SNAP,
  isPortable: isWindows && !!process.env.PORTABLE_EXECUTABLE_DIR,
  isDevelopment: isDevEnv,
  isAppImage: process.env.DESKTOPINTEGRATION === 'AppImageLauncher',
  sshAuthSock: process.env.SSH_AUTH_SOCK,
  environment: process.env.NODE_ENV,
  resourcesPath,
  env: {
    development: isDevEnv,
    test: testMode,
    production: !isDevEnv && !testMode
  },
  debugEnabled: !!process.env.DEBUG,
  DEBUG: process.env.DEBUG,
  platform: easyPlatform,
  darkMode: testMode ? true : electron?.nativeTheme.shouldUseDarkColors,
  userDirectory,
  downloadsDirectory,
  homeDirectory,
  testMode,
  appDbPath: path.join(userDirectory, isDevEnv ? 'app-dev.db' : 'app.db'),
  updatesDisabled,
  appVersion: testMode ? 'test-mode' : electron?.app.getVersion(),
  cloudUrl: isDevEnv ? 'https://staging.beekeeperstudio.io' : 'https://app.beekeeperstudio.io',
  locale,
  isCommunity: true,
  isUltimate: false,
}

export default platformInfo;
