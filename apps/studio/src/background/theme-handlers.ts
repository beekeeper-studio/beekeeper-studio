import { ipcMain, WebContents } from 'electron';
import { getThemeByName } from './theme-service';

// Track windows that have themes applied
const windowThemes: Record<number, string> = {};
const themeKeys: Record<string, string> = {};

export function setupThemeContentHandlers() {
  // Apply a theme to a window
  ipcMain.handle('themes/apply', async (event, { name }) => {
    try {
      const webContents = event.sender;
      const winId = webContents.id;

      // Get theme directly from the service
      const themeData = await getThemeByName(name);

      // Apply the CSS to the renderer
      await applyThemeCSS(webContents, name, themeData.css);

      // Remember which theme is applied to this window
      windowThemes[winId] = name;

      return { success: true };
    } catch (error) {
      console.error('Error applying theme:', error);
      throw error;
    }
  });

  // Remove the active theme
  ipcMain.handle('themes/removeActive', async (event) => {
    try {
      const webContents = event.sender;
      const winId = webContents.id;

      if (windowThemes[winId]) {
        await removeThemeCSS(webContents, windowThemes[winId]);
        delete windowThemes[winId];
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing theme:', error);
      throw error;
    }
  });
}

// Apply theme CSS to a window
async function applyThemeCSS(
  webContents: WebContents,
  themeName: string,
  css: string
) {
  // First remove any existing theme
  if (windowThemes[webContents.id]) {
    await removeThemeCSS(webContents, windowThemes[webContents.id]);
  }

  // Inject the CSS
  const key = await webContents.insertCSS(css, { cssOrigin: 'user' });

  // Store the key for later removal
  themeKeys[`${webContents.id}_${themeName}`] = key;

  return key;
}

// Remove theme CSS from a window
async function removeThemeCSS(webContents: WebContents, themeName: string) {
  try {
    const key = themeKeys[`${webContents.id}_${themeName}`];

    if (key) {
      // Remove the CSS
      await webContents.removeInsertedCSS(key);

      // Remove the stored key
      delete themeKeys[`${webContents.id}_${themeName}`];
    }
  } catch (error) {
    console.error('Error removing theme CSS:', error);
  }
}
