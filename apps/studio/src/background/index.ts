import { BrowserWindow, ipcMain } from 'electron';
import { electron } from 'process';
import NativeMenuBuilder from './NativeMenuBuilder';

// Simple function to initialize the application menu
function initMenu() {
  try {
    console.log('[Menu] Initializing application menu');

    // Get settings object - no theme needed
    const settings = {};

    // Create a new menu builder
    const menuBuilder = new NativeMenuBuilder(electron, settings as any);

    // Initialize the menu
    menuBuilder.initialize();
    console.log('[Menu] Menu initialized');

    return true;
  } catch (error) {
    console.error('[Menu] Error initializing application menu:', error);
    return false;
  }
}

// Initialize menu on startup
initMenu();

// Handle rebuilding menu when requested
ipcMain.on('app:rebuildMenu', () => {
  console.log('[Main Process] Received app:rebuildMenu event');
  initMenu();
});

// Setup global event bus for all windows
ipcMain.on('global-event', (_event, { name, data }) => {
  console.log(`[MAIN] Received global event: ${name}`, data);

  // Get all windows
  const windows = BrowserWindow.getAllWindows();

  // Forward to all renderer processes
  windows.forEach(window => {
    if (window && window.webContents) {
      window.webContents.send('global-event', { name, data });

      // Specifically for theme changes, update localStorage for persistence across restarts
      if (name === 'theme-changed' && data && data.id) {
        try {
          window.webContents.executeJavaScript(`
            localStorage.setItem('activeTheme', '${data.id}');
            console.log('[Theme] Updated localStorage with theme: ${data.id}');
            true;
          `).catch(err => console.error('[Theme] Error updating localStorage:', err));
        } catch (err) {
          console.error('[Theme] Error executing script:', err);
        }
      }
    }
  });
}); 
