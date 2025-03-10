import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { Theme } from '../store/modules/settings/ThemeStore';

// For Node.js environment
// const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const exists = util.promisify(fs.exists);

export interface ThemeData {
  name: string;
  path?: string;
  type: 'vscode' | 'textmate' | 'builtin';
  css: string;
}

// In-memory cache of themes
const themeCache: Record<string, ThemeData> = {};

// Get the themes directory
const getThemesDir = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'themes');
};

// Ensure the themes directory exists
async function ensureThemesDir() {
  const themesDir = getThemesDir();
  if (!(await exists(themesDir))) {
    await mkdir(themesDir, { recursive: true });
  }
  return themesDir;
}

// Generate CSS for a theme
function generateThemeCSS(theme: Theme): string {
  console.log(`DEBUG: Generating CSS for theme: ${theme.id}`);
  console.log(`DEBUG: Theme colors:`, JSON.stringify(theme.colors));

  const { id, colors } = theme;

  try {
    const css = `
/* Theme: ${theme.name} */
.theme-${id} {
  /* Basic colors */
  --theme-bg: ${colors.background};
  --theme-base: ${colors.foreground};
  --theme-string: ${colors.string};
  --theme-keyword: ${colors.keyword};
  
  /* UI colors */
  --theme-primary: ${colors.keyword};
  --theme-secondary: ${adjustColor(colors.keyword, -20)};
  --theme-error: #f44336;
  --theme-warning: #ff9800;
  --theme-success: #4caf50;
  
  /* Editor colors */
  --editor-bg: ${colors.background};
  --editor-fg: ${colors.foreground};
  
  /* Sidebar colors */
  --sidebar-bg: ${adjustColor(colors.background, -10)};
  --sidebar-fg: ${colors.foreground};
  
  /* Table colors */
  --table-header-bg: ${adjustColor(colors.background, -5)};
  --table-header-fg: ${colors.foreground};
  --table-row-bg: ${colors.background};
  --table-row-fg: ${colors.foreground};
  --table-row-alt-bg: ${adjustColor(colors.background, 5)};
  --table-border: ${adjustColor(colors.background, 15)};
}

/* Additional theme-specific rules */
.theme-${id} body {
  background-color: ${colors.background};
  color: ${colors.foreground};
}

.theme-${id} .tabulator-table .tabulator-row .tabulator-cell.edited {
  color: ${colors.background};
}

.theme-${id} .tabulator-table .tabulator-row.tabulator-selected {
  background-color: ${adjustColor(colors.background, 20)};
}

.theme-${id} .tabulator-table .tabulator-row:hover {
  background-color: ${adjustColor(colors.background, 10)};
}

.theme-${id} .sidebar {
  background-color: var(--sidebar-bg);
  color: var(--sidebar-fg);
}

.theme-${id} .editor {
  background-color: var(--editor-bg);
  color: var(--editor-fg);
}
`;
    console.log(`DEBUG: Successfully generated CSS for theme: ${theme.id}`);
    return css;
  } catch (error) {
    console.error(`DEBUG: Error generating CSS for theme ${theme.id}:`, error);
    throw error;
  }
}

// Adjust a color's brightness
function adjustColor(color: string, amount: number): string {
  console.log(`DEBUG: Adjusting color: ${color} by amount: ${amount}`);

  try {
    if (!color || typeof color !== 'string') {
      console.error(`DEBUG: Invalid color value: ${color}`);
      return '#000000';
    }

    color = color.replace('#', '');

    if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
      console.error(`DEBUG: Invalid hex color format: #${color}`);
      return '#000000';
    }

    let r = parseInt(color.substr(0, 2), 16);
    let g = parseInt(color.substr(2, 2), 16);
    let b = parseInt(color.substr(4, 2), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    const result = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    console.log(`DEBUG: Adjusted color result: ${result}`);
    return result;
  } catch (error) {
    console.error('DEBUG: Error adjusting color:', error);
    return color || '#000000';
  }
}

// Load all themes from the store
async function loadAllThemes() {
  try {
    console.log('DEBUG: Loading all themes...');

    // Import the ThemeStore to get the themes
    const { default: ThemeStoreModule } = await import('../store/modules/settings/ThemeStore');

    // Get the themes from the store
    const stateGetter = ThemeStoreModule.state;
    const themes = typeof stateGetter === 'function'
      ? stateGetter().availableThemes
      : [];

    console.log(`DEBUG: Found ${themes.length} themes in ThemeStore`);
    console.log(`DEBUG: Theme IDs: ${themes.map(t => t.id).join(', ')}`);

    // Process each theme
    for (const theme of themes) {
      try {
        console.log(`DEBUG: Processing theme: ${theme.id}`);
        console.log(`DEBUG: Theme object:`, JSON.stringify(theme));

        // Generate CSS for the theme
        const css = generateThemeCSS(theme);

        // Add to cache
        themeCache[theme.id] = {
          name: theme.name,
          type: 'builtin',
          css
        };

        console.log(`DEBUG: Successfully processed theme: ${theme.id}`);
      } catch (error) {
        console.error(`DEBUG: Error processing theme ${theme.id}:`, error);
      }
    }

    console.log(`DEBUG: Loaded ${Object.keys(themeCache).length} themes into cache`);
    console.log(`DEBUG: Cached theme IDs: ${Object.keys(themeCache).join(', ')}`);
  } catch (error) {
    console.error('DEBUG: Error loading themes:', error);
  }
}

// Initialize the theme service
export async function initializeThemeService() {
  try {
    console.log('DEBUG: Initializing theme service');
    await ensureThemesDir();
    await loadAllThemes();

    console.log('DEBUG: Theme service initialized');
    console.log(`DEBUG: Available themes: ${Object.keys(themeCache).join(', ')}`);
  } catch (error) {
    console.error('DEBUG: Error initializing theme service:', error);
  }
}

// Get a theme by name
export async function getThemeByName(name: string): Promise<ThemeData | null> {
  try {
    console.log(`DEBUG: Getting theme: ${name}`);

    // Check the cache first
    if (themeCache[name]) {
      console.log(`DEBUG: Theme found in cache: ${name}`);
      return themeCache[name];
    }

    // If not in cache, try to reload all themes
    console.log(`DEBUG: Theme ${name} not found in cache, reloading all themes`);
    await loadAllThemes();

    if (themeCache[name]) {
      console.log(`DEBUG: Theme found after reload: ${name}`);
      return themeCache[name];
    }

    // If still not found, try to find a theme with a similar name
    const themeIds = Object.keys(themeCache);
    console.log(`DEBUG: Available themes in cache: ${themeIds.join(', ')}`);

    const similarTheme = themeIds.find(id =>
      id.includes(name) || name.includes(id)
    );

    if (similarTheme) {
      console.log(`DEBUG: Found similar theme: ${similarTheme} for ${name}`);
      return themeCache[similarTheme];
    }

    // If all else fails, return a default dark theme
    console.log(`DEBUG: Theme ${name} not found, returning default dark theme`);
    return {
      name: 'default-dark',
      type: 'builtin',
      css: `
/* Default Dark Theme */
.theme-${name} {
  --theme-bg: #1e1e1e;
  --theme-base: #d4d4d4;
  --theme-string: #ce9178;
  --theme-keyword: #569cd6;
  
  --theme-primary: #569cd6;
  --theme-secondary: #4580b4;
  --theme-error: #f44336;
  --theme-warning: #ff9800;
  --theme-success: #4caf50;
  
  --editor-bg: #1e1e1e;
  --editor-fg: #d4d4d4;
  
  --sidebar-bg: #252526;
  --sidebar-fg: #d4d4d4;
  
  --table-header-bg: #252526;
  --table-header-fg: #d4d4d4;
  --table-row-bg: #1e1e1e;
  --table-row-fg: #d4d4d4;
  --table-row-alt-bg: #252526;
  --table-border: #3e3e42;
}

.theme-${name} body {
  background-color: #1e1e1e;
  color: #d4d4d4;
}

.theme-${name} .tabulator-table .tabulator-row .tabulator-cell.edited {
  color: #1e1e1e;
}

.theme-${name} .tabulator-table .tabulator-row.tabulator-selected {
  background-color: #264f78;
}

.theme-${name} .tabulator-table .tabulator-row:hover {
  background-color: #2a2d2e;
}

.theme-${name} .sidebar {
  background-color: #252526;
  color: #d4d4d4;
}

.theme-${name} .editor {
  background-color: #1e1e1e;
  color: #d4d4d4;
}
`
    };
  } catch (error) {
    console.error(`DEBUG: Error getting theme ${name}:`, error);
    return null;
  }
}

// Register a custom theme
export async function registerCustomTheme(themeId: string, css: string): Promise<void> {
  try {
    console.log(`DEBUG: Registering custom theme: ${themeId}`);
    const themesDir = await ensureThemesDir();
    const themePath = path.join(themesDir, `${themeId}.css`);

    // Save the CSS to a file
    await writeFile(themePath, css, 'utf8');

    // Cache the theme
    themeCache[themeId] = {
      name: themeId,
      path: themePath,
      type: 'vscode',
      css
    };

    console.log(`DEBUG: Successfully registered custom theme: ${themeId}`);
  } catch (error) {
    console.error(`DEBUG: Error registering custom theme ${themeId}:`, error);
    throw error;
  }
}

// Remove a custom theme
export async function removeCustomTheme(themeId: string): Promise<void> {
  try {
    console.log(`DEBUG: Removing custom theme: ${themeId}`);
    if (themeCache[themeId] && themeCache[themeId].path) {
      // Remove the file
      await util.promisify(fs.unlink)(themeCache[themeId].path!);

      // Remove from cache
      delete themeCache[themeId];

      console.log(`DEBUG: Successfully removed custom theme: ${themeId}`);
    } else {
      console.log(`DEBUG: Theme ${themeId} not found in cache or has no path`);
    }
  } catch (error) {
    console.error(`DEBUG: Error removing custom theme ${themeId}:`, error);
    throw error;
  }
}

// Get all themes
export function getAllThemes(): ThemeData[] {
  console.log(`DEBUG: Getting all themes, count: ${Object.keys(themeCache).length}`);
  return Object.values(themeCache);
}
