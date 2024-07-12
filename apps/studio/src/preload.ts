import { contextBridge, ipcRenderer } from 'electron';
import { AppEvent } from './common/AppEvent';
import path from 'path';
import fs from 'fs';
import { Options } from 'yargs-parser';
import yargs from 'yargs-parser';
import { SettingsPlugin } from './plugins/SettingsPlugin';
import { homedir } from 'os';

const electron = require('@electron/remote');

const isDevEnv = !(electron?.app && (electron?.app.isPackaged ?? process.env.isPackaged));
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
const windowPrefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
let userDirectory =  testMode ? './tmp' : electron?.app.getPath("userData")
const downloadsDirectory = testMode ? './tmp' : electron?.app.getPath('downloads')
const homeDirectory = testMode ? './tmp' : electron?.app.getPath('home')
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}
const updatesDisabled = !!process.env.BEEKEEPER_DISABLE_UPDATES
const locale = electron?.app?.getLocale() ?? process.env.locale;

function fileExistsSync(filename: string): boolean {
  try {
    return fs.statSync(filename).isFile();
  } catch (e) {
    return false;
  }
}

export const api = {
  isReady: () => {
    ipcRenderer.send('ready');
  },
  send: (event: AppEvent, name: string, arg?: any) => {
    if (!AppEvent[event]) return;
    ipcRenderer.send(event, name, arg)
  },
  resolve: (toResolve: string) => {
    return path.resolve(toResolve);
  },
  join: (...paths: string[]): string => {
    return path.join(...paths);
  },
  yargs: (argv: string | string[], opts?: Options) => {
    return yargs(argv, opts);
  },
  platformInfo: () => {
    return {
      isWindows, isMac, isArm,
      oracleSupported: isMac && isArm ? false : true,
      isLinux: !isWindows && !isMac,
      sessionType,
      isWayland: isWaylandMode(),
      isSnap: process.env.ELECTRON_SNAP,
      isPortable: isWindows && process.env.PORTABLE_EXECUTABLE_DIR,
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
      darkMode: testMode ? true : electron?.nativeTheme.shouldUseDarkColors || windowPrefersDarkMode,
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
  },
  readVimrc(pathToVimrc?: string): string[] {
    const vimrcPath = path.join(pathToVimrc ?? userDirectory, ".beekeeper.vimrc");
    if (fileExistsSync(vimrcPath)) {
      const data = fs.readFileSync(vimrcPath, { encoding: 'utf-8', flag: 'r'});
      const dataSplit = data.split("\n");
      return dataSplit;
    }

    return [];
  },
  async getLastExportPath(filename?: string) {
    return await SettingsPlugin.get(
      "lastExportPath",
      path.join(homedir(), filename)
    );
  },
  showOpenDialogSync(args: any) {
    return electron.dialog.showOpenDialogSync(args);
  },
  showSaveDialogSync(args: any) {
    return electron.dialog.showSaveDialogSync(args);
  },
  openLink(link: string) {
    return electron.shell.openExternal(link);
  },
  // this scares me
  getCurrentWindow() {
    return electron.getCurrentWindow();
  },
  writeTextToClipboard(text: string) {
    return electron.clipboard.writeText(text);
  },
  readTextFromClipboard(): string {
    return electron.clipboard.readText();
  },
  openPath(path: string) {
    return electron.shell.openPath(path);
  },
  showItemInFolder(path: string) {
    electron.shell.showItemInFolder(path);
  },
}

contextBridge.exposeInMainWorld('main', api);
