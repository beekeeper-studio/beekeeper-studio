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
  console.log('Received showThemeManager event in preload');

  // Try multiple approaches to ensure the event is handled

  // 1. Dispatch a DOM event
  window.dispatchEvent(new CustomEvent(AppEvent.showThemeManager));

  // 2. Call the global method if it exists
  if (typeof window.showThemeManagerModal === 'function') {
    window.showThemeManagerModal();
  }

  // 3. Try to emit to Vue root if available
  if (window.$root && typeof window.$root.$emit === 'function') {
    window.$root.$emit('show-theme-manager');
  }
}); 
