import { AppEvent } from '@/common/AppEvent';
import { SettingsPlugin } from '@/plugins/SettingsPlugin';
import * as electron from '@electron/remote';
import { execSync } from 'child_process';
import { contextBridge, ipcRenderer } from 'electron';
import 'electron-log/preload';
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';
import pluralize from 'pluralize';
import tls, { SecureVersion } from 'tls';
import username from 'username';

console.log('[Preload] SCRIPT EXECUTION STARTED');
console.log(`[Preload] Timestamp: ${Date.now()}`);
console.log(`[Preload] window object available: ${typeof window !== 'undefined'}`);
console.log(`[Preload] document object available: ${typeof document !== 'undefined'}`);

// Import contextBridge and check if it's available
console.log(`[Preload] contextBridge available: ${typeof contextBridge !== 'undefined'}`);

// Add TypeScript declaration to handle window.__vue_app__
declare global {
  interface Window {
    __vue_app__?: {
      showThemeManager?: () => void;
      themeManager?: {
        showModal: () => void;
      };
    };
    showThemeManagerModal?: () => boolean;
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, callback: (...args: any[]) => void) => (() => void);
        removeListener: (channel: string, callback: (...args: any[]) => void) => void;
        invoke: (channel: string, ...args: any[]) => Promise<any>;
      };
      receive: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Create a simple global event system
const GLOBAL_LISTENERS = {};

const testMode = process.env.TEST_MODE ? true : false;
let userDirectory = testMode ? './tmp' : electron?.app.getPath("userData")
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

// Set up simple global function to show theme manager
if (typeof window !== 'undefined') {
  window.showThemeManagerModal = function () {
    console.log('[Global] showThemeManagerModal global function called');

    // Dispatch DOM events for maximum compatibility
    window.dispatchEvent(new Event('show-theme-manager'));
    return true;
  };
}

// Valid channels for IPC communication
const validChannels = {
  // Channels the renderer can listen on
  receive: [
    'theme:update-local',
    'theme:changed',
    'global-event'
  ],

  // Channels the renderer can send on
  send: [
    'theme:update',
    'global-event'
  ],

  // Channels for invoke/handle
  invoke: []
};

console.log('[Preload] Setting up electron contextBridge API');

// Expose a secure API to the renderer process
try {
  contextBridge.exposeInMainWorld('electron', {
    // IPC communication
    ipcRenderer: {
      // Send a message to the main process
      send(channel, ...args) {
        if (validChannels.send.includes(channel)) {
          console.log(`[Preload] Sending message on channel: ${channel}`, ...args);
          ipcRenderer.send(channel, ...args);
        } else {
          console.warn(`[Preload] Attempted to send on invalid channel: ${channel}`);
        }
      },

      // Register a listener for messages from the main process
      on(channel, callback) {
        if (validChannels.receive.includes(channel)) {
          console.log(`[Preload] Registering listener for channel: ${channel}`);
          // Create a wrapper that removes the event
          const subscription = (_event, ...args) => {
            console.log(`[Preload] Received message on channel: ${channel}`, ...args);
            callback(...args);
          };
          ipcRenderer.on(channel, subscription);

          // Return a function to remove the listener
          return () => {
            console.log(`[Preload] Removing listener for channel: ${channel}`);
            ipcRenderer.removeListener(channel, subscription);
          };
        }
        // Return a no-op function for invalid channels
        console.warn(`[Preload] Attempted to listen on invalid channel: ${channel}`);
        return () => { console.log(`No listener registered for invalid channel: ${channel}`); };
      },

      // Remove a listener
      removeListener(channel, callback) {
        if (validChannels.receive.includes(channel)) {
          console.log(`[Preload] Removing listener for channel: ${channel}`);
          ipcRenderer.removeListener(channel, callback);
        } else {
          console.warn(`[Preload] Attempted to remove listener from invalid channel: ${channel}`);
        }
      },

      // Invoke a method in the main process
      invoke(channel, ...args) {
        if (validChannels.invoke.includes(channel)) {
          console.log(`[Preload] Invoking method on channel: ${channel}`, ...args);
          return ipcRenderer.invoke(channel, ...args);
        }
        console.warn(`[Preload] Attempted to invoke on invalid channel: ${channel}`);
        return Promise.reject(new Error(`Invalid channel: ${channel}`));
      }
    },

    // Add a receive method for AppEvent
    receive(channel, callback) {
      if (validChannels.receive.includes(channel)) {
        console.log(`[Preload] Registering receive handler for channel: ${channel}`);
        ipcRenderer.on(channel, (_event, ...args) => {
          console.log(`[Preload] Received message on channel: ${channel}`, ...args);
          callback(...args);
        });
      } else {
        console.warn(`[Preload] Attempted to receive on invalid channel: ${channel}`);
      }
    }
  });
  console.log('[Preload] electron API successfully exposed via contextBridge');

  // Add a flag to check if the preload script executed successfully
  contextBridge.exposeInMainWorld('__preloadExecuted', true);
} catch (err) {
  console.error('[Preload] Failed to expose electron API via contextBridge:', err);
}

// Add a global event emitter that works with context isolation
try {
  contextBridge.exposeInMainWorld('globalEvent', {
    // Send an event to all renderer processes
    emit: (eventName, data) => {
      console.log(`[Preload] Emitting global event: ${eventName}`, data);
      ipcRenderer.send('global-event', { name: eventName, data });
    },

    // Listen for global events
    on: (eventName, callback) => {
      console.log(`[Preload] Adding listener for global event: ${eventName}`);

      if (!GLOBAL_LISTENERS[eventName]) {
        GLOBAL_LISTENERS[eventName] = [];
      }

      GLOBAL_LISTENERS[eventName].push(callback);

      // Return an unsubscribe function
      return () => {
        console.log(`[Preload] Removing listener for global event: ${eventName}`);
        GLOBAL_LISTENERS[eventName] = GLOBAL_LISTENERS[eventName].filter(cb => cb !== callback);
      };
    }
  });
  console.log('[Preload] globalEvent API successfully exposed via contextBridge');
} catch (err) {
  console.error('[Preload] Failed to expose globalEvent via contextBridge:', err);
}

// Handle global events from the main process
ipcRenderer.on('global-event', (_event, { name, data }) => {
  console.log(`[Preload] Received global event: ${name}`, data);

  // Dispatch to registered listeners
  if (GLOBAL_LISTENERS[name]) {
    GLOBAL_LISTENERS[name].forEach(callback => callback(data));
  }

  // Also dispatch as a DOM event
  try {
    window.dispatchEvent(new CustomEvent(name, { detail: data }));
  } catch (err) {
    console.error(`[Preload] Error dispatching DOM event ${name}:`, err);
  }
});

// Store this script's loaded status in localStorage for debugging
localStorage.setItem('preloadScriptLoaded', 'true');
localStorage.setItem('preloadScriptVersion', '3.0');
localStorage.setItem('preloadScriptTimestamp', Date.now().toString());
console.log('[Preload] Preload script fully loaded and initialized');

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
  enableConnectionMenuItems() {
    ipcRenderer.send("enable-connection-menu-items");
  },
  disableConnectionMenuItems() {
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
      const data = fs.readFileSync(vimrcPath, { encoding: 'utf-8', flag: 'r' });
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
  // Minimal theme API
  broadcastThemeChange(themeId: string) {
    // Use global event system for theme broadcasts
    ipcRenderer.send('global-event', {
      name: 'theme-changed',
      data: { id: themeId }
    });
  }
}

// Expose the API via contextBridge
contextBridge.exposeInMainWorld('main', api); 
