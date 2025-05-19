import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler';
import { defaultThemes } from '@/components/theme/ThemeConfigurations';
import { DevLicenseState } from '@/lib/license';
import { IPlatformInfo } from '../IPlatformInfo';
import { IGroupedUserSettings } from '../transport/TransportUserSetting';

// helper function to get the current theme from localStorage
function getCurrentTheme(): string {
  // in renderer process (has window)
  if (typeof window !== 'undefined' && window.localStorage) {
    const theme = window.localStorage.getItem('activeTheme') || 'dark';
    console.log('getCurrentTheme() from localStorage:', theme);
    return theme;
  }

  // in main process (no window) - the theme should be passed through settings
  // This will log in the main process context
  console.log('getCurrentTheme() in main process - will use provided theme');
  return 'dark'; // Default, but this should be overridden by the provided settings
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

export function menuItems(actionHandler: IMenuActionHandler, settings: IGroupedUserSettings, platformInfo: IPlatformInfo) {
  // Define built-in default themes
  const builtInThemes = [
    { id: 'system', label: 'System' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'solarized', label: 'Solarized' },
    { id: 'solarized-dark', label: 'Solarized Dark' }
  ];

  // In main process, settings.theme.value should be explicitly provided
  const settingsTheme = settings?.theme?.value as string | undefined;
  console.log('[MenuItems] Settings theme from argument:', settingsTheme);

  // Get the current theme from settings or localStorage
  const currentTheme = settingsTheme || getCurrentTheme();
  console.log('[MenuItems] Current theme determined as:', currentTheme);

  // Default theme IDs for quick checking
  const builtInThemeIds = builtInThemes.map(t => t.id);
  console.log('[MenuItems] Built-in theme IDs:', builtInThemeIds);

  // Check if current theme is a custom theme (not a built-in theme)
  const isCustomTheme = currentTheme && !builtInThemeIds.includes(currentTheme);
  console.log('[MenuItems] Current theme:', currentTheme, 'Is custom theme:', isCustomTheme);

  // Build the theme submenu items
  const themeSubmenu = [];

  // Add all built-in themes
  builtInThemes.forEach(theme => {
    const isChecked = currentTheme === theme.id;
    console.log(`[MenuItems] Adding built-in theme: ${theme.id}, checked: ${isChecked}`);

    themeSubmenu.push({
      type: 'radio',
      label: theme.label,
      id: theme.id,
      click: actionHandler.switchTheme,
      checked: isChecked
    });
  });

  // If using a custom theme, add only the current one to the menu
  if (isCustomTheme) {
    // Add a separator before custom theme
    themeSubmenu.push({ type: 'separator' } as any);

    // Find the custom theme in ThemeConfigurations.defaultThemes if possible
    const customThemeConfig = defaultThemes.find(t => t.id === currentTheme);

    if (customThemeConfig) {
      // Use the name from ThemeConfigurations if available
      console.log(`[MenuItems] Adding current custom theme from config: ${currentTheme}`);

      themeSubmenu.push({
        type: 'radio',
        label: customThemeConfig.name,
        id: currentTheme,
        click: actionHandler.switchTheme,
        checked: true
      });
    } else {
      // Create a formatted name for unknown custom themes
      const formattedName = formatThemeName(currentTheme);
      console.log(`[MenuItems] Adding unknown custom theme: ${currentTheme}, formatted as: ${formattedName}`);

      themeSubmenu.push({
        type: 'radio',
        label: formattedName,
        id: currentTheme,
        click: actionHandler.switchTheme,
        checked: true
      });
    }
  }

  // Add separator and find themes option
  themeSubmenu.push({ type: 'separator' } as any);
  themeSubmenu.push({
    type: 'normal',
    label: 'Find Additional Themes...',
    id: 'find-themes',
    click: actionHandler.manageCustomThemes,
    checked: false
  });

  // Log the final theme submenu state for debugging
  console.log('[MenuItems] Final theme submenu:', themeSubmenu.map(item =>
    item.type === 'separator' ? '---' : `${item.label} (${item.id}) - ${item.checked ? 'checked' : 'unchecked'}`
  ));

  return {
    upgradeModal: (label: string) => {
      return {
        id: `upgrade-${label}`,
        label: label,
        click: actionHandler.upgradeModal
      }
    },
    quit: {
      id: 'quit',
      label: platformInfo.isMac ? 'Quit' : 'Exit',
      accelerator: platformInfo.isMac ? 'CommandOrControl+Q' : undefined,
      click: actionHandler.quit
    },
    undo: {
      id: 'undo',
      label: "Undo",
      accelerator: "CommandOrControl+Z",
      click: actionHandler.undo
    },
    redo: {
      id: "redo",
      label: "Redo",
      accelerator: platformInfo.isWindows ? 'Ctrl+Y' : 'Shift+CommandOrControl+Z',
      click: actionHandler.redo
    },
    cut: {
      id: 'cut',
      label: 'Cut',
      accelerator: 'CommandOrControl+X',
      click: actionHandler.cut,
      registerAccelerator: false

    },
    copy: {
      id: 'copy',
      label: 'Copy',
      accelerator: 'CommandOrControl+C',
      click: actionHandler.copy,
      registerAccelerator: false
    },
    paste: {
      id: 'paste',
      label: 'Paste',
      accelerator: 'CommandOrControl+V',
      click: actionHandler.paste,
      registerAccelerator: false
    },

    selectAll: {
      id: 'select-all',
      label: 'Select All',
      accelerator: 'CommandOrControl+A',
      click: actionHandler.selectAll
    },
    // view
    zoomreset: {
      id: 'zoom-reset',
      label: "Reset Zoom",
      accelerator: "CommandOrControl+0",
      click: actionHandler.zoomreset
    },
    zoomin: {
      id: 'zoom-in',
      label: "Zoom In",
      accelerator: 'CommandOrControl+=',
      click: actionHandler.zoomin
    },
    zoomout: {
      id: 'zoom-out',
      label: "Zoom Out",
      accelerator: "CommandOrControl+-",
      click: actionHandler.zoomout
    },
    fullscreen: {
      id: 'fullscreen',
      label: "Toggle Full Screen",
      accelerator: platformInfo.isMac ? 'Shift+CommandOrControl+F' : 'F11',
      click: actionHandler.fullscreen
    },
    // help
    about: {
      id: 'about',
      label: 'About Beekeeper Studio',
      click: actionHandler.about
    },
    devtools: {
      id: 'dev-tools',
      label: "Show Developer Tools",
      nonNativeMacOSRole: true,
      click: actionHandler.devtools
    },
    checkForUpdate: {
      id: 'updatecheck',
      label: 'Check for Software Updates',
      click: actionHandler.checkForUpdates
    },
    opendocs: {
      id: 'opendocs',
      label: 'Documentation',
      click: actionHandler.opendocs
    },
    support: {
      id: 'contactSupport',
      label: 'Contact Support',
      click: actionHandler.contactSupport
    },
    reload: {
      id: 'reload-window',
      label: "Reload Window",
      accelerator: "CommandOrControl+Shift+R",
      click: actionHandler.reload
    },
    newWindow: {
      id: 'new-window',
      label: "New Window",
      accelerator: "CommandOrControl+Shift+N",
      click: actionHandler.newWindow
    },
    addBeekeeper: {
      id: 'add-beekeeper',
      label: "Add Beekeeper's Database",
      click: actionHandler.addBeekeeper
    },
    newTab: {
      id: "new-query-menu",
      label: "New Tab",
      accelerator: "CommandOrControl+T",
      click: actionHandler.newQuery,
      enabled: false,
    },
    closeTab: {
      id: 'close-tab',
      label: "Close Tab",
      accelerator: "CommandOrControl+W",
      click: actionHandler.closeTab,
      registerAccelerator: false,
      enabled: false,
    },
    importSqlFiles: {
      id: 'import-sql-files',
      label: "Import SQL Files",
      accelerator: "CommandOrControl+I",
      click: actionHandler.importSqlFiles,
      showWhenConnected: true,
      enabled: false,
    },
    quickSearch: {
      id: 'go-to',
      label: "Quick Search",
      accelerator: "CommandOrControl+P",
      registerAccelerator: false,
      click: actionHandler.quickSearch,
      enabled: false,
    },
    disconnect: {
      id: 'disconnect',
      label: "Disconnect",
      accelerator: "Shift+CommandOrControl+Q",
      click: actionHandler.disconnect,
      enabled: false,
    },
    primarySidebarToggle: {
      id: 'menu-toggle-sidebar',
      label: 'Toggle Primary Sidebar',
      accelerator: "Alt+S",
      click: actionHandler.togglePrimarySidebar,
      enabled: false,
    },
    secondarySidebarToggle: {
      id: 'menu-secondary-sidebar',
      label: 'Toggle Secondary Sidebar',
      // accelerator: "Alt+S",
      click: actionHandler.toggleSecondarySidebar,
      enabled: false,
    },
    themeToggle: {
      id: "theme-toggle-menu",
      label: "Select Theme",
      submenu: themeSubmenu
    },
    enterLicense: {
      id: 'enter-license',
      label: "Manage License Keys",
      click: actionHandler.enterLicense,

    },
    backupDatabase: {
      id: 'backup-database',
      label: "Create a Database Backup",
      click: actionHandler.backupDatabase,
      enabled: false,
    },
    restoreDatabase: {
      id: 'restore-database',
      label: "Restore a Database Backup",
      click: actionHandler.restoreDatabase,
      enabled: false,
    },
    exportTables: {
      id: 'export-tables',
      label: 'Export Data',
      click: actionHandler.exportTables,
      enabled: false,
    },
    minimalModeToggle: {
      id: "minimal-mode-toggle",
      label: "Toggle Minimal Mode",
      click: actionHandler.toggleMinimalMode,
    },
    licenseState: {
      id: "license-state",
      label: "DEV Switch License State",
      submenu: [
        { label: ">>> BEWARE: ALL LICENSES WILL BE LOST! <<<" },
        {
          label: "First time install, no license, no trial.",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.firstInstall),
        },
        {
          label: "On a trial license",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.onTrial),
        },
        {
          label: "Trial expired",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.trialExpired),
        },
        {
          label: "On an active paid license",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.activePaidLicense),
        },
        {
          label: "On an expired, lifetime license, that covers this version",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.expiredLifetimeCoversThisVersion),
        },
        {
          label: "On an expired, lifetime license, that covers an earlier version",
          click: (item, win) => actionHandler.switchLicenseState(item, win, DevLicenseState.expiredLifetimeCoversEarlierVersion),
        },
      ],
    },
    toggleBeta: {
      id: "toggle-beta",
      label: "Release Channel",
      submenu: [
        {
          type: 'radio',
          label: 'Stable',
          click: actionHandler.toggleBeta,
          checked: settings?.useBeta?.value == false
        },
        {
          type: 'radio',
          label: 'Beta',
          click: actionHandler.toggleBeta,
          checked: settings?.useBeta?.value == true
        }
      ]
    }
  }
}
