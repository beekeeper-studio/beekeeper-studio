import platformInfo from '@/common/platform_info'
import rawLog from '@bksLogger'
import { BrowserWindow, ipcMain, Menu } from 'electron'
import { AppEvent } from '../common/AppEvent'
import { IGroupedUserSettings } from '../common/appdb/models/user_setting'
import { menuItems } from '../common/menus/MenuItems'
import NativeMenuActionHandlers from './NativeMenuActionHandlers'

const log = rawLog.scope('NativeMenuBuilder')

export default class NativeMenuBuilder {
  private handler: NativeMenuActionHandlers
  private currentTheme: string | null = null
  private menu?: Electron.Menu

  constructor(private electron: any, settings: IGroupedUserSettings) {
    this.handler = new NativeMenuActionHandlers(settings)
    this.rebuildMenu(settings)
  }

  initialize(): void {
    if (this.menu) {
      Menu.setApplicationMenu(this.menu)
    }
    this.listenForClicks()
    this.listenForToggleConnectionMenuItems();
  }

  rebuildMenu(settings: IGroupedUserSettings): void {
    try {
      // Extract current theme from settings
      const currentTheme = settings?.theme?.value as string;

      console.log('[NativeMenuBuilder] Building menu with theme:', currentTheme);

      // Only rebuild the menu if the theme has changed or if we don't have a menu yet
      if (this.currentTheme !== currentTheme || !this.menu) {
        console.log('[NativeMenuBuilder] Theme changed, rebuilding menu');

        this.currentTheme = currentTheme;
        const items = menuItems(this.handler, settings, platformInfo)

        // Build the application menu
        const template = this.buildMenuTemplate(items)

        // Create the menu
        this.menu = Menu.buildFromTemplate(template)

        console.log('[NativeMenuBuilder] Menu rebuilt successfully');
      } else {
        console.log('[NativeMenuBuilder] Theme has not changed, skipping menu rebuild');
      }
    } catch (error) {
      console.error('[NativeMenuBuilder] Error rebuilding menu:', error);
    }
  }

  // Method to force a menu rebuild regardless of theme change
  forceRebuild(settings: IGroupedUserSettings): void {
    console.log('[NativeMenuBuilder] Forcing menu rebuild');
    this.currentTheme = null; // Reset the current theme to force a rebuild
    this.rebuildMenu(settings);
    this.initialize();
  }

  toggleConnectionMenuItems(action: "enable" | "disable") {
    if (!this.menu) {
      return;
    }

    const isEnabled = action === "enable" ? true : false;

    const getMenuItems = (label: string) => this.menu?.items.find(item => item.label === label)?.submenu?.items ?? [];

    const toggleMenuMap = {
      File: ["new-query-menu", "go-to", "disconnect", "import-sql-files", "close-tab"],
      View: ["menu-toggle-sidebar", "menu-secondary-sidebar"],
      Tools: ["backup-database", "restore-database", "export-tables"]
    };

    for (const [menuLabel, toggleMenuIds] of Object.entries(toggleMenuMap)) {
      const menuItems = getMenuItems(menuLabel);
      menuItems.forEach(menuItem => {
        if (toggleMenuIds.includes(menuItem.id)) {
          menuItem.enabled = isEnabled;
        }
      })
    }
  }

  listenForClicks(): void {
    ipcMain.on(AppEvent.menuClick, (event, actionName: keyof NativeMenuActionHandlers, arg) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender)
        log.debug("Received Menu Click, event", actionName, arg, window)
        if (window) {
          const func = this.handler[actionName].bind(this.handler)
          func(arg ?? null, window)
        }
      } catch (e) {
        console.error(`Couldn't trigger action ${actionName}(${arg || ""}), ${e.message}`)
      }
    })
  }

  listenForToggleConnectionMenuItems(): void {
    ipcMain.on("enable-connection-menu-items", (_event) => this.toggleConnectionMenuItems("enable"));
    ipcMain.on("disable-connection-menu-items", (_event) => this.toggleConnectionMenuItems("disable"));
  }

  manageCustomThemes() {
    // Send an event to the renderer to show the theme manager
    this.sendToFocusedWindow(AppEvent.showThemeManager);
  }

  private sendToFocusedWindow(channel: string, ...args: any[]) {
    const focusedWindow = this.electron.BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.send(channel, ...args);
    }
  }

  switchTheme(menuItem) {
    const themeName = menuItem.label.toLowerCase();

    if (themeName === 'custom') {
      // Show the theme manager and let the user select a custom theme
      this.sendToFocusedWindow(AppEvent.showThemeManager);

      // If there's an active custom theme, keep it active
      // Otherwise, activate the first available custom theme
      this.sendToFocusedWindow('activate-custom-theme');
    } else {
      // For built-in themes, deactivate any custom theme
      this.sendToFocusedWindow('deactivate-custom-theme');

      // Set the built-in theme
      this.sendToFocusedWindow('set-theme', themeName);
    }
  }

  private buildMenuTemplate(menuItemsObj: any): Electron.MenuItemConstructorOptions[] {
    // Convert menuItems object into Electron menu template
    if (!platformInfo.isMac) {
      return [];
    }

    // Create template for macOS 
    return [
      {
        label: 'Beekeeper Studio',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          menuItemsObj.enterLicense,
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          menuItemsObj.quit
        ]
      },
      {
        label: 'File',
        submenu: [
          menuItemsObj.newWindow,
          menuItemsObj.newTab,
          menuItemsObj.addBeekeeper,
          { type: 'separator' },
          menuItemsObj.closeTab,
          menuItemsObj.importSqlFiles,
          { type: 'separator' },
          menuItemsObj.disconnect
        ]
      },
      {
        label: 'Edit',
        submenu: [
          menuItemsObj.undo,
          menuItemsObj.redo,
          { type: 'separator' },
          menuItemsObj.cut,
          menuItemsObj.copy,
          menuItemsObj.paste,
          { role: 'pasteAndMatchStyle' },
          menuItemsObj.selectAll,
        ]
      },
      {
        label: 'View',
        submenu: [
          menuItemsObj.zoomreset,
          menuItemsObj.zoomin,
          menuItemsObj.zoomout,
          { type: 'separator' },
          menuItemsObj.fullscreen,
          menuItemsObj.themeToggle,
          { type: 'separator' },
          menuItemsObj.primarySidebarToggle,
          menuItemsObj.secondarySidebarToggle,
          { type: 'separator' },
          menuItemsObj.reload
        ]
      },
      {
        label: 'Tools',
        submenu: [
          menuItemsObj.quickSearch,
          { type: 'separator' },
          menuItemsObj.backupDatabase,
          menuItemsObj.restoreDatabase,
          menuItemsObj.exportTables
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ]
      },
      {
        role: 'help',
        submenu: [
          menuItemsObj.opendocs,
          menuItemsObj.support,
          { type: 'separator' },
          menuItemsObj.checkForUpdate,
          menuItemsObj.toggleBeta,
          { type: 'separator' },
          menuItemsObj.devtools
        ]
      }
    ];
  }
}
