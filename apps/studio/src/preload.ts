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
