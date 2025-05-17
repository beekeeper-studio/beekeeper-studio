import { WebContents } from 'electron';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

const readFile = util.promisify(fs.readFile);

export interface ThemeColors {
  background: string;
  foreground: string;
  string: string;
  keyword: string;
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

async function applyThemeCSS(
  webContents: WebContents,
  themeName: string,
  css: string
) {
  try {
    const cssKey = `theme-${themeName}`;
    // Insert or replace CSS
    await webContents.insertCSS(css, { cssOrigin: 'user' });
    return cssKey;
  } catch (error) {
    console.error('Error applying theme CSS:', error);
    return null;
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

// Export the theme utilities that need to be available to main process
export {
  applyThemeCSS
};

