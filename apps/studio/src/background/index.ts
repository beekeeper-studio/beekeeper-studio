import { baseThemes, defaultThemes } from '@/components/theme/ThemeConfigurations';
import { BrowserWindow, ipcMain, Menu } from 'electron';
import { electron } from 'process';
import { UserSetting } from '../common/appdb/models/user_setting';
import NativeMenuBuilder from './NativeMenuBuilder';

// Theme registry interface
interface ThemeRegistry {
  currentTheme: string;
  themeDetails: Record<string, any>;
}

// Format a theme name for display
function formatThemeName(themeId: string): string {
  if (!themeId) return 'Unknown Theme';

  // Convert dashed names to space-separated words
  return themeId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    // Format special abbreviations
    .replace(/Github/g, 'GitHub')
    .replace(/Vscode/g, 'VSCode')
    .replace(/Css/g, 'CSS')
    .replace(/Json/g, 'JSON')
    .replace(/Sql/g, 'SQL');
}

// Get theme details from ThemeConfigurations or create a default entry
function getThemeDetails(themeId: string): any {
  // Check if it's a built-in theme
  if (baseThemes.includes(themeId)) {
    return {
      id: themeId,
      name: formatThemeName(themeId),
      isBuiltIn: true
    };
  }

  // Try to find it in defaultThemes
  const themeConfig = defaultThemes.find(t => t.id === themeId);
  if (themeConfig) {
    return themeConfig;
  }

  // Create a basic theme entry for unknown themes
  return {
    id: themeId,
    name: formatThemeName(themeId),
    description: 'Custom theme',
    isCustom: true
  };
}

// Create a theme registry to maintain theme information
const themeRegistry: ThemeRegistry = {
  currentTheme: 'dark',
  themeDetails: {}
};

// Listen for theme updates from any renderer process
ipcMain.on('theme:update', (event, themeData) => {
  console.log('[Main Process] Received theme update:', themeData);

  // Ensure we have a valid theme ID
  if (!themeData || !themeData.id) {
    console.error('[Main Process] Invalid theme update data');
    return;
  }

  // Get complete theme information from ThemeConfigurations
  const themeId = themeData.id;
  const themeDetails = getThemeDetails(themeId);

  // Merge incoming data with theme details
  const completeThemeData = {
    ...themeDetails,
    ...themeData,
    // Ensure these fields are always present
    id: themeId,
    name: themeData.name || themeDetails.name || formatThemeName(themeId)
  };

  console.log('[Main Process] Complete theme data:', completeThemeData);

  // Update the theme registry
  themeRegistry.currentTheme = themeId;
  themeRegistry.themeDetails[themeId] = completeThemeData;

  // Broadcast the theme change to all windows
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents && (!event || window.webContents !== event.sender)) {
      window.webContents.send('theme:changed', completeThemeData);
    }
  });

  // Rebuild the application menu to reflect the theme change
  rebuildApplicationMenu(themeId, true);
});

// Listen for app:rebuildMenu events from renderer
ipcMain.on('app:rebuildMenu', (_event, args) => {
  console.log('[Main Process] Received app:rebuildMenu event:', args);

  // If theme was provided, use it for the menu rebuild
  if (args && args.theme) {
    rebuildApplicationMenu(args.theme, args.forceRefresh === true);
  } else {
    rebuildApplicationMenu(themeRegistry.currentTheme, args?.forceRefresh === true);
  }
});

// Handler for explicit menu rebuilds
ipcMain.handle('app/rebuildMenu', async (event, args) => {
  try {
    console.log('[Menu rebuild] Starting menu rebuild with args:', args);

    // If theme was directly provided in the arguments, use it
    let currentTheme = args?.theme;
    console.log('[Menu rebuild] Theme from args:', currentTheme);

    if (!currentTheme) {
      currentTheme = themeRegistry.currentTheme;
      console.log('[Menu rebuild] Theme from registry:', currentTheme);

      // If not in registry, try to get from localStorage or settings
      if (!currentTheme) {
        try {
          // Execute script in renderer to get localStorage value
          const result = await event.sender.executeJavaScript('localStorage.getItem("activeTheme")');
          currentTheme = result;
          console.log('[Menu rebuild] Theme from renderer localStorage:', currentTheme);
        } catch (err) {
          console.error('[Menu rebuild] Error getting theme from renderer:', err);
        }

        // Fall back to database if needed
        if (!currentTheme) {
          const settings = await UserSetting.all();
          console.log('[Menu rebuild] Fetched settings from database:', Object.keys(settings).length, 'settings found');
          currentTheme = settings.theme ? settings.theme.value : null;
          console.log('[Menu rebuild] Current theme setting from database:', currentTheme);
        }
      }
    }

    console.log('[Menu rebuild] Final theme to use for menu:', currentTheme);

    // Update the theme registry to ensure consistency
    if (currentTheme) {
      themeRegistry.currentTheme = currentTheme;

      // If we don't have theme details yet, create basic entry
      if (!themeRegistry.themeDetails[currentTheme]) {
        themeRegistry.themeDetails[currentTheme] = {
          id: currentTheme,
          name: formatThemeName(currentTheme)
        };
      }
    }

    // Rebuild the application menu with force refresh if specified
    rebuildApplicationMenu(currentTheme, args?.forceRefresh === true);

    return { success: true, theme: currentTheme };
  } catch (error) {
    console.error('[Menu rebuild] Error rebuilding menu:', error);
    return { success: false, error: error.message };
  }
});

// Function to rebuild the application menu
function rebuildApplicationMenu(themeId: string, forceRefresh = false) {
  try {
    console.log('[Menu rebuild] Rebuilding application menu with theme:', themeId, 'force refresh:', forceRefresh);

    // Ensure we have a valid theme ID
    if (!themeId) {
      themeId = themeRegistry.currentTheme || 'dark';
      console.log('[Menu rebuild] Using fallback theme:', themeId);
    }

    // Create settings object with the current theme
    const settings = {
      theme: { value: themeId }
    };

    // Create a new menu builder
    const menuBuilder = new NativeMenuBuilder(electron, settings as any);

    // Rebuild menu with the updated theme
    menuBuilder.rebuildMenu(settings as any);

    // Initialize the menu
    menuBuilder.initialize();

    // If force refresh is requested, manually update the menu in all windows
    if (forceRefresh) {
      console.log('[Menu rebuild] Force refreshing menu in all windows');

      // Get the current application menu
      const currentMenu = Menu.getApplicationMenu();

      // Apply to all windows
      BrowserWindow.getAllWindows().forEach(window => {
        try {
          // For some platforms, setting to null first helps with refresh
          if (window.setMenu) {
            window.setMenu(null);
            window.setMenu(currentMenu);
          }
        } catch (err) {
          console.error('[Menu rebuild] Error refreshing menu in window:', err);
        }
      });
    }

    console.log('[Menu rebuild] Menu rebuilt successfully with theme:', themeId);
  } catch (error) {
    console.error('[Menu rebuild] Error rebuilding application menu:', error);
  }
} 
