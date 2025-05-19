import { contextBridge, ipcRenderer } from 'electron';
import { AppEvent } from './common/AppEvent';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
  ipcRenderer: {
    on(channel, func) {
      const validChannels = [AppEvent.showThemeManager];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (_event, ...args) => func(...args));
      }
    },
    removeListener(channel, func) {
      const validChannels = [AppEvent.showThemeManager];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, (_event, ...args) => func(...args));
      }
    },
    invoke(channel, ...args) {
      const validChannels = ['app/rebuildMenu'];
      if (validChannels.includes(channel)) {
        console.log(`Invoking channel ${channel} from preload`);
        return ipcRenderer.invoke(channel, ...args);
      }
      console.error(`Invalid channel for invoke: ${channel}`);
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  }
}
);

// Set up a direct listener for the theme manager event
ipcRenderer.on(AppEvent.showThemeManager, () => {
  // Emit to Vue root if available
  if (window.$root && typeof window.$root.$emit === 'function') {
    window.$root.$emit(AppEvent.showThemeManager);
  }
}); 
