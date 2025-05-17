import { promises as fs } from 'fs';
import path from 'path';
import { parseTextMateTheme } from '../background/theme-parsers';
import { getThemeByName, registerCustomTheme, removeCustomTheme } from '../background/theme-service';

export interface IThemeHandlers {
  "themes/apply": (args: { name: string; sId: string }) => Promise<{ success: boolean; error?: string }>;
  "themes/removeActive": (args: { sId: string }) => Promise<{ success: boolean; error?: string }>;
  "themes/register": (args: { buffer: string; fileName: string; sId: string }) => Promise<{ success: boolean; themeId?: string; theme?: any; error?: string }>;
  "themes/remove": (args: { themeId: string; sId: string }) => Promise<{ success: boolean; error?: string }>;
  "themes/getCSS": (args: { name: string; sId: string }) => Promise<{ success: boolean; css?: string; theme?: any; error?: string }>;
  "themes/uploadTmTheme": (args: { content: string; fileName: string; sId: string }) => Promise<{ success: boolean; theme?: any; error?: string }>;
  "themes/import": (args: { filePath: string; sId: string }) => Promise<{ success: boolean; theme?: any; error?: string }>;
}

export const ThemeHandlers: IThemeHandlers = {
  "themes/apply": async function ({ name }) {
    try {
      const themeData = await getThemeByName(name);
      if (!themeData) {
        return { success: false, error: 'Theme not found' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  "themes/removeActive": async function () {
    try {
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  "themes/register": async function ({ buffer }) {
    try {
      const parsedTheme = parseTextMateTheme(buffer);
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
      return { success: false, error: error.message };
    }
  },

  "themes/remove": async function ({ themeId }) {
    try {
      await removeCustomTheme(themeId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  "themes/getCSS": async function ({ name }) {
    try {
      const themeData = await getThemeByName(name);
      if (!themeData) {
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
      return { success: false, error: error.message };
    }
  },

  "themes/uploadTmTheme": async function ({ content }) {
    try {
      const parsedTheme = parseTextMateTheme(content);
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
      return { success: false, error: error.message };
    }
  },

  "themes/import": async function ({ filePath }) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const extension = path.extname(filePath).toLowerCase();

      if (extension === '.json') {
        return await this["themes/register"]({ buffer: content });
      } else if (extension === '.tmTheme' || extension === '.xml') {
        return await this["themes/uploadTmTheme"]({ content });
      } else {
        return { success: false, error: 'Unsupported file format' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}; 
