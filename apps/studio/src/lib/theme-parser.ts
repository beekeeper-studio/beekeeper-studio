import fs from 'fs';
import path from 'path';

// Map of VS Code theme tokens to Beekeeper variables
const VS_CODE_TOKEN_MAP = {
  // Base colors
  'editor.background': '--theme-bg',
  'editor.foreground': '--theme-base',
  'activityBar.background': '--sidebar-bg',
  'button.background': '--theme-primary',
  'button.foreground': '--button-text',
  'editor.selectionBackground': '--selection-bg',
  'sideBar.background': '--sidebar-bg',
  'list.activeSelectionBackground': '--list-active-bg',
  'list.hoverBackground': '--list-hover-bg',
  'tab.activeBackground': '--tab-active-bg',
  'tab.inactiveBackground': '--tab-inactive-bg',
  // Add more mappings as needed
};

export interface ParsedTheme {
  name: string;
  colors: Record<string, string>;
  beekeeperVariables: Record<string, string>;
  type: 'vscode' | 'textmate';
}

/**
 * Parse a VS Code theme file
 */
export function parseVSCodeTheme(filePath: string): ParsedTheme {
  try {
    const themeContent = fs.readFileSync(filePath, 'utf8');
    const theme = JSON.parse(themeContent);

    const beekeeperVariables = {};

    // Map VS Code colors to Beekeeper variables
    for (const [vsToken, bksVariable] of Object.entries(VS_CODE_TOKEN_MAP)) {
      if (theme.colors && theme.colors[vsToken]) {
        beekeeperVariables[bksVariable] = theme.colors[vsToken];
      }
    }

    return {
      name: theme.name || path.basename(filePath, '.json'),
      colors: theme.colors || {},
      beekeeperVariables,
      type: 'vscode',
    };
  } catch (error) {
    console.error('Error parsing VS Code theme:', error);
    throw new Error(`Failed to parse theme: ${error.message}`);
  }
}

/**
 * Parse a TextMate/Sublime theme file
 * Requires the plist package for XML parsing
 */
export async function parseTextMateTheme(
  filePath: string
): Promise<ParsedTheme> {
  try {
    const themeContent = fs.readFileSync(filePath, 'utf8');
    let theme;

    // Import plist dynamically to avoid bundling it with the renderer
    const plist = await import('plist');

    // Parse based on file extension
    if (filePath.endsWith('.tmTheme')) {
      theme = plist.parse(themeContent);
    } else {
      theme = JSON.parse(themeContent);
    }

    const beekeeperVariables = {};
    const settings = theme.settings || [];
    const generalSettings = settings.find((s) => !s.scope) || {};

    // Map general settings to Beekeeper variables
    if (generalSettings.settings) {
      if (generalSettings.settings.background) {
        beekeeperVariables['--theme-bg'] = generalSettings.settings.background;
      }
      if (generalSettings.settings.foreground) {
        beekeeperVariables['--theme-base'] =
          generalSettings.settings.foreground;
      }
      // Add more mappings for TextMate themes
    }

    return {
      name: theme.name || path.basename(filePath),
      colors: theme.colors || {},
      beekeeperVariables,
      type: 'textmate',
    };
  } catch (error) {
    console.error('Error parsing TextMate theme:', error);
    throw new Error(`Failed to parse theme: ${error.message}`);
  }
}
