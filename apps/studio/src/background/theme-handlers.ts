import { BrowserWindow, ipcMain, WebContents } from 'electron';
import { ParsedTheme, parseThemeBuffer } from './theme-parsers';
import { getThemeByName } from './theme-service';

// Track windows that have themes applied
const windowThemes: Record<number, string> = {};
const themeKeys: Record<string, string> = {};

// Store custom themes
const customThemes: Record<string, ParsedTheme> = {};

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

  // Register a custom theme
  ipcMain.handle('theme/register', async (_event, { buffer, fileName }) => {
    try {
      // Parse the theme
      const parsedTheme = parseThemeBuffer(buffer, fileName);

      // Store the theme
      customThemes[parsedTheme.id] = parsedTheme;

      return {
        success: true,
        themeId: parsedTheme.id,
        theme: {
          id: parsedTheme.id,
          name: parsedTheme.name,
          type: parsedTheme.type,
          colors: parsedTheme.colors
        }
      };
    } catch (error) {
      console.error('Error registering theme:', error);
      return { success: false, error: error.message };
    }
  });

  // Get a custom theme
  ipcMain.handle('theme/get', async (_event, { themeId }) => {
    try {
      const theme = customThemes[themeId];

      if (!theme) {
        return { success: false, error: 'Theme not found' };
      }

      return { success: true, theme };
    } catch (error) {
      console.error('Error getting theme:', error);
      return { success: false, error: error.message };
    }
  });

  // Apply a custom theme
  ipcMain.handle('theme/apply', async (event, { themeId }) => {
    try {
      const theme = customThemes[themeId];

      if (!theme) {
        return { success: false, error: 'Theme not found' };
      }

      const webContents = event.sender;
      const winId = webContents.id;

      // Apply the CSS to the renderer
      await applyThemeCSS(webContents, themeId, theme.css);

      // Remember which theme is applied to this window
      windowThemes[winId] = themeId;

      return { success: true };
    } catch (error) {
      console.error('Error applying theme:', error);
      return { success: false, error: error.message };
    }
  });

  // List all custom themes
  ipcMain.handle('theme/list', async () => {
    try {
      const themes = Object.values(customThemes).map(theme => ({
        id: theme.id,
        name: theme.name,
        type: theme.type,
        colors: theme.colors
      }));

      return { success: true, themes };
    } catch (error) {
      console.error('Error listing themes:', error);
      return { success: false, error: error.message };
    }
  });

  // Remove a custom theme
  ipcMain.handle('theme/remove', async (event, { themeId }) => {
    try {
      if (!customThemes[themeId]) {
        return { success: false, error: 'Theme not found' };
      }

      // Remove the theme from all windows that use it
      const webContents = event.sender;
      const winId = webContents.id;

      if (windowThemes[winId] === themeId) {
        await removeThemeCSS(webContents, themeId);
        delete windowThemes[winId];
      }

      // Remove the theme from storage
      delete customThemes[themeId];

      return { success: true };
    } catch (error) {
      console.error('Error removing theme:', error);
      return { success: false, error: error.message };
    }
  });
}

// Apply theme CSS to a window
async function applyThemeCSS(
  webContents: WebContents,
  themeName: string,
  css: string
) {
  try {
    console.log(`Applying CSS for theme ${themeName} to window ${webContents.id}`);

    // First remove any existing theme
    if (windowThemes[webContents.id]) {
      await removeThemeCSS(webContents, windowThemes[webContents.id]);
    }

    // Make sure we have valid CSS
    if (!css || css.trim() === '') {
      console.error(`Empty CSS for theme ${themeName}`);
      return null;
    }

    // Inject the CSS
    const key = await webContents.insertCSS(css, { cssOrigin: 'user' });
    console.log(`CSS injected for theme ${themeName} with key ${key.substring(0, 10)}...`);

    // Store the key for later removal
    themeKeys[`${webContents.id}_${themeName}`] = key;

    // Also set the theme class directly via JavaScript
    await webContents.executeJavaScript(`
      // Set the theme class on the body
      document.body.className = document.body.className
        .replace(/theme-[a-zA-Z0-9-_]+/g, '')
        .trim() + ' theme-${themeName}';
      
      // Apply some direct styles to ensure the theme is applied
      document.body.style.backgroundColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--theme-bg').trim() || '${themeName === 'light' ? '#ffffff' : '#1e1e1e'}';
      document.body.style.color = getComputedStyle(document.documentElement)
        .getPropertyValue('--theme-base').trim() || '${themeName === 'light' ? '#333333' : '#d4d4d4'}';
      
      // Dispatch a custom event to notify the app that the theme has changed
      document.dispatchEvent(new CustomEvent('theme-changed', { 
        detail: { theme: '${themeName}' } 
      }));
      
      console.log('Theme class and styles set to: theme-${themeName}');
    `);

    return key;
  } catch (error) {
    console.error(`Error applying CSS for theme ${themeName}:`, error);
    return null;
  }
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

/**
 * Apply a theme to a specific window
 * @param window The BrowserWindow to apply the theme to
 * @param themeName The name/id of the theme to apply
 */
export async function applyThemeToWindow(window: BrowserWindow, themeName: string): Promise<void> {
  try {
    console.log(`Applying theme ${themeName} to window ${window.id}`);

    // Get theme data from the service
    const themeData = await getThemeByName(themeName);

    if (!themeData) {
      console.error(`Theme not found: ${themeName}`);
      return;
    }

    console.log(`Got theme data for ${themeName}, CSS length: ${themeData.css.length}`);

    // Apply the CSS to the window
    const cssKey = await applyThemeCSS(window.webContents, themeName, themeData.css);

    if (!cssKey) {
      console.error(`Failed to apply CSS for theme ${themeName}`);
    } else {
      // Remember which theme is applied to this window
      windowThemes[window.id] = themeName;
      console.log(`Successfully applied theme ${themeName} to window ${window.id}`);
    }
  } catch (error) {
    console.error(`Error applying theme ${themeName} to window:`, error);
  }
}
