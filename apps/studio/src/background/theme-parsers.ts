import { ipcMain, WebContents } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { getThemeByName, registerCustomTheme, removeCustomTheme } from './theme-service';

// Track windows that have themes applied
const windowThemes: Record<number, string> = {};
const themeKeys: Record<string, string> = {};

// For Node.js environment
const readFile = util.promisify(fs.readFile);

export interface ThemeColors {
  background: string;
  foreground: string;
  string: string;
  keyword: string;
  // Add more color mappings as needed
}

export interface ParsedTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  colors: ThemeColors;
  rawColors: Record<string, string>;
  css: string;
}

/**
 * VSCode theme format
 */
export interface VSCodeTheme {
  name: string;
  type: 'dark' | 'light';
  colors: Record<string, string>;
  tokenColors: Array<{
    name?: string;
    scope?: string | string[];
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    }
  }>;
}

/**
 * TextMate/Sublime theme format (simplified)
 */
export interface TextMateTheme {
  name: string;
  settings: Array<{
    name?: string;
    scope?: string;
    settings: {
      foreground?: string;
      background?: string;
      fontStyle?: string;
    }
  }>;
}

export function setupThemeContentHandlers() {
  // Apply a theme to a window
  ipcMain.handle('themes/apply', async (event, { name }) => {
    try {
      console.log(`IPC: Applying theme ${name} to window ${event.sender.id}`);
      const webContents = event.sender;
      const winId = webContents.id;

      // Get theme directly from the service
      const themeData = await getThemeByName(name);

      if (!themeData) {
        console.error(`IPC: Theme not found: ${name}`);
        return { success: false, error: 'Theme not found' };
      }

      console.log(`IPC: Got theme data for ${name}, CSS length: ${themeData.css.length}`);

      // Apply the CSS to the renderer
      const cssKey = await applyThemeCSS(webContents, name, themeData.css);

      if (!cssKey) {
        console.error(`IPC: Failed to apply CSS for theme ${name}`);
        return { success: false, error: 'Failed to apply CSS' };
      }

      // Remember which theme is applied to this window
      windowThemes[winId] = name;

      console.log(`IPC: Successfully applied theme ${name} to window ${winId}`);
      return { success: true };
    } catch (error) {
      console.error('IPC: Error applying theme:', error);
      return { success: false, error: error.message };
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

      // Register the theme with the theme service
      await registerCustomTheme(parsedTheme.id, parsedTheme.css);

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

  // Remove a custom theme
  ipcMain.handle('theme/remove', async (event, { themeId }) => {
    try {
      // Remove the theme from the theme service
      await removeCustomTheme(themeId);

      // Remove the theme from all windows that use it
      const webContents = event.sender;
      const winId = webContents.id;

      if (windowThemes[winId] === themeId) {
        await removeThemeCSS(webContents, themeId);
        delete windowThemes[winId];
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing theme:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a new handler for getting theme CSS
  ipcMain.handle('themes/getCSS', async (_event, { name }) => {
    try {
      console.log(`IPC: Getting CSS for theme ${name}`);

      // Get theme directly from the service
      const themeData = await getThemeByName(name);

      if (!themeData) {
        console.error(`IPC: Theme not found: ${name}`);
        return { success: false, error: 'Theme not found' };
      }

      return {
        success: true,
        css: themeData.css,
        theme: {
          name: themeData.name,
          type: themeData.type
        }
      };
    } catch (error) {
      console.error('IPC: Error getting theme CSS:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a handler for uploading .tmTheme files
  ipcMain.handle('themes/uploadTmTheme', async (_event, { content, fileName }) => {
    try {
      console.log(`IPC: Uploading .tmTheme file: ${fileName}`);

      // Parse the theme
      const parsedTheme = parseTextMateTheme(content);

      // Register the theme with the theme service
      await registerCustomTheme(parsedTheme.id, parsedTheme.css);

      return {
        success: true,
        theme: {
          id: parsedTheme.id,
          name: parsedTheme.name,
          type: parsedTheme.type,
          colors: parsedTheme.colors
        }
      };
    } catch (error) {
      console.error('IPC: Error uploading .tmTheme file:', error);
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
      
      // Dispatch a custom event to notify the app that the theme has changed
      document.dispatchEvent(new CustomEvent('theme-changed', { 
        detail: { theme: '${themeName}' } 
      }));
      
      console.log('Theme class set to: theme-${themeName}');
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
 * Parse a theme file based on its extension
 */
export async function parseThemeFile(filePath: string): Promise<ParsedTheme> {
  const ext = path.extname(filePath).toLowerCase();
  const content = await readFile(filePath, 'utf8');

  switch (ext) {
    case '.json':
      return parseVSCodeTheme(content);
    case '.tmtheme':
    case '.xml':
      return parseTextMateTheme(content);
    default:
      throw new Error(`Unsupported theme file format: ${ext}`);
  }
}

/**
 * Parse a VSCode theme from JSON content
 */
export function parseVSCodeTheme(content: string): ParsedTheme {
  try {
    const vsTheme: VSCodeTheme = JSON.parse(content);

    // Extract basic theme info
    const id = vsTheme.name.toLowerCase().replace(/\s+/g, '-');
    const type = vsTheme.type || 'dark';

    // Map VSCode colors to our theme colors
    const colors: ThemeColors = {
      background: vsTheme.colors['editor.background'] || (type === 'dark' ? '#1e1e1e' : '#ffffff'),
      foreground: vsTheme.colors['editor.foreground'] || (type === 'dark' ? '#d4d4d4' : '#333333'),
      string: findTokenColor(vsTheme, 'string') || (type === 'dark' ? '#ce9178' : '#a31515'),
      keyword: findTokenColor(vsTheme, 'keyword') || (type === 'dark' ? '#569cd6' : '#0000ff')
    };

    // Generate CSS variables
    const css = generateThemeCSS(id, colors, vsTheme.colors);

    return {
      id,
      name: vsTheme.name,
      type,
      colors,
      rawColors: vsTheme.colors,
      css
    };
  } catch (error) {
    throw new Error(`Failed to parse VSCode theme: ${error.message}`);
  }
}

/**
 * Parse a TextMate/Sublime theme from XML content
 */
export function parseTextMateTheme(content: string): ParsedTheme {
  try {
    const parser = new XMLParser({ ignoreAttributes: false });
    const xmlData = parser.parse(content);
    const tmTheme = xmlData.plist.dict;

    // Extract theme name
    const nameIndex = tmTheme.key.findIndex((k: string) => k === 'name');
    const name = nameIndex >= 0 ? tmTheme.string[nameIndex] : 'Imported Theme';
    const id = name.toLowerCase().replace(/\s+/g, '-');

    // Find the general settings
    const settingsIndex = tmTheme.key.findIndex((k: string) => k === 'settings');
    const generalSettings = tmTheme.array[settingsIndex].dict[0];

    // Extract background and foreground colors
    const bgIndex = generalSettings.key.findIndex((k: string) => k === 'background');
    const fgIndex = generalSettings.key.findIndex((k: string) => k === 'foreground');

    const background = bgIndex >= 0 ? generalSettings.string[bgIndex] : '#1e1e1e';
    const foreground = fgIndex >= 0 ? generalSettings.string[fgIndex] : '#d4d4d4';

    // Determine if it's a dark or light theme based on background brightness
    const isDark = isColorDark(background);
    const type = isDark ? 'dark' : 'light';

    // Find string and keyword colors from other settings
    let stringColor = '#ce9178';
    let keywordColor = '#569cd6';

    // Loop through other settings to find string and keyword scopes
    for (let i = 1; i < tmTheme.array[settingsIndex].dict.length; i++) {
      const setting = tmTheme.array[settingsIndex].dict[i];
      const scopeIndex = setting.key.findIndex((k: string) => k === 'scope');

      if (scopeIndex >= 0) {
        const scope = setting.string[scopeIndex];
        const settingsDict = setting.dict.find((d: any) => d.key.includes('settings'));

        if (settingsDict) {
          const fgIdx = settingsDict.key.findIndex((k: string) => k === 'foreground');
          if (fgIdx >= 0) {
            const color = settingsDict.string[fgIdx];

            if (scope.includes('string')) {
              stringColor = color;
            } else if (scope.includes('keyword')) {
              keywordColor = color;
            }
          }
        }
      }
    }

    const colors: ThemeColors = {
      background,
      foreground,
      string: stringColor,
      keyword: keywordColor
    };

    // Generate CSS
    const css = generateThemeCSS(id, colors, {});

    return {
      id,
      name,
      type,
      colors,
      rawColors: {
        'editor.background': background,
        'editor.foreground': foreground
      },
      css
    };
  } catch (error) {
    throw new Error(`Failed to parse TextMate theme: ${error.message}`);
  }
}

/**
 * Find a token color from VSCode theme
 */
function findTokenColor(vsTheme: VSCodeTheme, tokenType: string): string | null {
  const token = vsTheme.tokenColors.find(t => {
    if (!t.scope) return false;
    const scopes = Array.isArray(t.scope) ? t.scope : [t.scope];
    return scopes.some(s => s.includes(tokenType));
  });

  return token?.settings.foreground || null;
}

/**
 * Generate CSS for a theme
 */
function generateThemeCSS(themeId: string, colors: ThemeColors, rawColors: Record<string, string>): string {
  // Basic CSS variables
  const cssVars = [
    `--theme-bg: ${colors.background};`,
    `--theme-base: ${colors.foreground};`,
    `--theme-string: ${colors.string};`,
    `--theme-keyword: ${colors.keyword};`,

    // Add more mappings based on rawColors
    `--theme-primary: ${rawColors['statusBar.background'] || '#4caf50'};`,
    `--theme-secondary: ${rawColors['activityBar.background'] || '#2196f3'};`,
    `--theme-error: ${rawColors['errorForeground'] || '#f44336'};`,
    `--theme-warning: ${rawColors['editorWarning.foreground'] || '#ff9800'};`,
    `--theme-success: ${rawColors['editorInfo.foreground'] || '#4caf50'};`,
  ];

  // Generate additional CSS rules based on the theme
  const additionalRules = [
    `.theme-${themeId} .tabulator-table .tabulator-row .tabulator-cell.edited { color: ${colors.background}; }`,
    `.theme-${themeId} .tabulator-table .tabulator-row.tabulator-selected { background-color: ${adjustColor(colors.background, 20)}; }`,
  ];

  // Combine everything
  return `
.theme-${themeId} {
  ${cssVars.join('\n  ')}
}

${additionalRules.join('\n')}
  `;
}

/**
 * Determine if a color is dark or light
 */
function isColorDark(color: string): boolean {
  // Remove the hash if it exists
  color = color.replace('#', '');

  // Parse the color
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);

  // Calculate brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return true if the color is dark
  return brightness < 128;
}

/**
 * Adjust a color's brightness
 */
function adjustColor(color: string, amount: number): string {
  // Remove the hash if it exists
  color = color.replace('#', '');

  // Parse the color
  let r = parseInt(color.substr(0, 2), 16);
  let g = parseInt(color.substr(2, 2), 16);
  let b = parseInt(color.substr(4, 2), 16);

  // Adjust the brightness
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Parse a theme from a buffer (for use in renderer process)
 */
export function parseThemeBuffer(buffer: ArrayBuffer, fileName: string): ParsedTheme {
  const ext = path.extname(fileName).toLowerCase();
  const content = new TextDecoder().decode(buffer);

  switch (ext) {
    case '.json':
      return parseVSCodeTheme(content);
    case '.tmtheme':
    case '.xml':
      return parseTextMateTheme(content);
    default:
      throw new Error(`Unsupported theme file format: ${ext}`);
  }
}
