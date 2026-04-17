import { contextBridge, ipcRenderer, nativeImage } from 'electron';
import { AppEvent } from '@/common/AppEvent';
import path from 'path';
import fs from 'fs';
import { SettingsPlugin } from '@/plugins/SettingsPlugin';
import { homedir } from 'os';
import tls, { SecureVersion } from 'tls';
import username from 'username';
import { execSync } from 'child_process';
import 'electron-log/preload';
import pluralize from 'pluralize';
import type { SaveFileOptions } from '@/backend/lib/FileHelpers';
import type { NativePluginMenuItem } from '@/services/plugin/types';

const electron = require('@electron/remote');

const testMode = process.env.TEST_MODE ? true : false;
let userDirectory =  testMode ? './tmp' : electron?.app.getPath("userData")
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  userDirectory = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'beekeeper_studio_data')
}

function fileExistsSync(filename: string): boolean {
  try {
    return fs.statSync(filename).isFile();
  } catch (e) {
    return false;
  }
}

export const api = {
  async requestPlatformInfo() {
    const platformInfo = await ipcRenderer.invoke('platformInfo')
    contextBridge.exposeInMainWorld('platformInfo', platformInfo);
  },
  async requestBksConfigSource() {
    const bksConfigSource = await ipcRenderer.invoke('bksConfigSource')
    contextBridge.exposeInMainWorld('bksConfigSource', bksConfigSource);
  },
  isReady() {
    ipcRenderer.send('ready');
  },
  enableConnectionMenuItems(){
    ipcRenderer.send("enable-connection-menu-items");
  },
  disableConnectionMenuItems(){
    ipcRenderer.send("disable-connection-menu-items");
  },
  send(event: AppEvent, name: string, arg?: any) {
    if (!Object.values<string>(AppEvent).includes(event)) return;
    ipcRenderer.send(event, name, arg)
  },
  on(event: AppEvent, bind: any) {
    if (!Object.values<string>(AppEvent).includes(event)) return;
    ipcRenderer.on(event, bind);
  },
  onUtilDied(bind: any) {
    ipcRenderer.on('utilDied', bind);
  },
  onUpdateEvent(event: 'update-available' | 'manual-update' | 'update-downloaded', bind: any) {
    const eType = ['update-available', 'manual-update', 'update-downloaded'];
    if (!eType.includes(event)) return;
    ipcRenderer.on(event, bind);
  },
  updaterReady() {
    ipcRenderer.send('updater-ready');
  },
  triggerDownload() {
    ipcRenderer.send('download-update');
  },
  triggerInstall() {
    ipcRenderer.send('install-update');
  },
  openExternally(link: string) {
    ipcRenderer.send(AppEvent.openExternally, [link]);
  },
  resolve(toResolve: string) {
    return path.resolve(toResolve);
  },
  join(...paths: string[]): string {
    return path.join(...paths);
  },
  basename(p: string, ext?: string): string {
    return path.basename(p, ext);
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
  async defaultExportPath(filename?: string) {
    return path.join(homedir(), filename);
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
  onMaximize(func: any, sId: string) {
    ipcRenderer.on(`maximize-${sId}`, func);
  },
  onUnmaximize(func: any, sId: string) {
    ipcRenderer.on(`unmaximize-${sId}`, func);
  },
  onEnterFullscreen(func: any, sId: string) {
    ipcRenderer.on(`enter-full-screen-${sId}`, func);
  },
  onLeaveFullscreen(func: any, sId: string) {
    ipcRenderer.on(`leave-full-screen-${sId}`, func);
  },
  async isMaximized() {
    return await ipcRenderer.invoke('isMaximized');
  },
  async isFullscreen() {
    return await ipcRenderer.invoke('isFullscreen');
  },
  async setFullScreen(value: boolean) {
    await ipcRenderer.invoke('setFullscreen', value);
  },
  async minimizeWindow() {
    await ipcRenderer.invoke('minimizeWindow');
  },
  async unmaximizeWindow() {
    await ipcRenderer.invoke('unmaximizeWindow');
  },
  async maximizeWindow() {
    await ipcRenderer.invoke('maximizeWindow');
  },
  async closeWindow() {
    await ipcRenderer.invoke('closeWindow');
  },
  writeTextToClipboard(text: string) {
    return electron.clipboard.writeText(text);
  },
  writeImageToClipboard(dataUrl: string) {
    return electron.clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
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
  setTlsMinVersion(version: SecureVersion) {
    tls.DEFAULT_MIN_VERSION = version;
  },
  async fetchUsername(): Promise<string> {
    return await username();
  },
  setWindowTitle(title: string) {
    ipcRenderer.send('setWindowTitle', title);
  },
  hasSshKeysPlug() {
    return execSync('snapctl is-connected ssh-keys');
  },
  attachPortListener() {
    ipcRenderer.on('port', (event, { sId, utilDied }) => {
      window.postMessage({ type: 'port', sId }, '*', event.ports);

      if (utilDied) {
        ipcRenderer.emit('utilDied');
      }
    })
  },
  requestPorts() {
    ipcRenderer.invoke('requestPorts');
  },
  pluralize(word: string, count?: number, inclusive?: boolean) {
    return pluralize(word, count, inclusive);
  },
  fileHelpers: {
    save(options: SaveFileOptions) {
      return ipcRenderer.invoke('fileHelpers:save', options);
    },
  },
  addNativeMenuItem(item: NativePluginMenuItem) {
    ipcRenderer.send('add-native-menu-item', item);
  },
  removeNativeMenuItem(id: string) {
    ipcRenderer.send('remove-native-menu-item', id);
  },
}

contextBridge.exposeInMainWorld('main', api);
