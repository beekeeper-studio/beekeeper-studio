import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler';
import { DevLicenseState } from '@/lib/license';
import { IPlatformInfo } from '../IPlatformInfo';
import { IGroupedUserSettings } from '../transport/TransportUserSetting';

// helper function to get the current theme from localStorage
function getCurrentTheme(): string {
  // access localStorage if available (in browser environment)
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('activeTheme') || 'dark';
  }
  return 'dark'; // Default fallback
}

export function menuItems(actionHandler: IMenuActionHandler, settings: IGroupedUserSettings, platformInfo: IPlatformInfo) {
  // default themes list
  const defaultThemes = ['system', 'light', 'dark', 'solarized', 'solarized-dark'];

  // Get the effective current theme (prefer settings value if available)
  const effectiveTheme = (settings?.theme?.value || getCurrentTheme()) as string;

  // create the submenu for themes
  const themeSubmenu = [
    {
      type: 'radio',
      label: 'System',
      click: actionHandler.switchTheme,
      checked: effectiveTheme === 'system'
    },
    {
      type: 'radio',
      label: 'Light',
      click: actionHandler.switchTheme,
      checked: effectiveTheme === 'light'
    },
    {
      type: 'radio',
      label: 'Dark',
      click: actionHandler.switchTheme,
      checked: effectiveTheme === 'dark'
    },
    {
      type: 'radio',
      label: 'Solarized',
      click: actionHandler.switchTheme,
      checked: effectiveTheme === 'solarized'
    },
    {
      type: 'radio',
      label: 'Solarized Dark',
      click: actionHandler.switchTheme,
      checked: effectiveTheme === 'solarized-dark'
    },
  ];

  // if current theme is not one of the defaults, add it to the menu
  if (effectiveTheme && !defaultThemes.includes(effectiveTheme)) {
    themeSubmenu.push({ type: 'separator' } as any);
    themeSubmenu.push({
      type: 'radio',
      label: `${effectiveTheme.charAt(0).toUpperCase()}${effectiveTheme.slice(1).replace(/-/g, ' ')}`,
      click: actionHandler.switchTheme,
      checked: true
    });
  }

  // add separator and "Find Additional Themes..." option
  themeSubmenu.push({ type: 'separator' } as any);
  themeSubmenu.push({
    type: 'normal',
    label: 'Find Additional Themes...',
    click: actionHandler.manageCustomThemes,
    checked: false
  });

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
