import DefaultMenu from './BaseMenuBuilder'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { IGroupedUserSettings } from '../transport/TransportUserSetting'
import { IPlatformInfo } from '../IPlatformInfo'

export default class extends DefaultMenu {
  constructor(settings: IGroupedUserSettings, handler: IMenuActionHandler, platformInfo: IPlatformInfo, private bksConfig: IBksConfig) {
    super(settings, handler, platformInfo)
  }

  viewMenu(): Electron.MenuItemConstructorOptions {
    const result: Electron.MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        this.menuItems.zoomreset,
        this.menuItems.zoomin,
        this.menuItems.zoominNumpad,
        this.menuItems.zoomout,
        this.menuItems.zoomoutNumpad,
        { type: 'separator' },
        this.menuItems.editorFontSizeReset,
        this.menuItems.editorFontSizeIncrease,
        this.menuItems.editorFontSizeDecrease,
        { type: 'separator' },
        this.menuItems.primarySidebarToggle,
        this.menuItems.secondarySidebarToggle,
        { type: 'separator' },
        this.menuItems.themeToggle,
        this.menuItems.reload,
        // This is added automatically in Mac
        ...(!this.platformInfo.isMac ? this.menuItems.fullscreen : []),
        // Disable this for now in favor of #2380
        // this.menuItems.minimalModeToggle,
      ]
    }
    return result
  }

  devMenu() {
    return {
      id: 'dev',
      label: 'Dev',
      submenu: [
        this.menuItems.reload,
        this.menuItems.licenseState,
      ],
    }
  }

  helpMenu() {
    const helpMenu = {
      id: "help",
      label: "Help",
      submenu: [
        this.menuItems.keyboardShortcuts,
        this.menuItems.opendocs,
        this.menuItems.support,
        { type: 'separator' },
        this.menuItems.addBeekeeper,
        this.menuItems.devtools,
        // Moved to Beekeeper Studio menu for mac
        ...(!this.platformInfo.isMac ? [this.menuItems.checkForUpdate] : []),
        this.menuItems.restart,
        { type: 'separator' },
        // Moved to Beekeeper Studio menu for mac
        ...(!this.platformInfo.isMac ? [this.menuItems.about] : []),
        this.menuItems.enterLicense,
      ]
    };

    if (!this.platformInfo.isLinux || this.platformInfo.isAppImage) {
      helpMenu.submenu.push(this.menuItems.toggleBeta)
    }

    return helpMenu;
  }

  buildTemplate(): Electron.MenuItemConstructorOptions[] {
    const appMenu: Electron.MenuItemConstructorOptions[] = []
    if (this.platformInfo.isMac) {
      appMenu.push({
        label: "Beekeeper Studio",
        submenu: [
          this.menuItems.about,
          this.menuItems.checkForUpdate,
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      })
    }

    const fileMenu = {
      id: 'file',
      label: 'File',
      submenu: [
        this.menuItems.newWindow,
        this.menuItems.newTab,
        this.menuItems.closeTab,
        { type: 'separator' },
        this.menuItems.importSqlFiles,
        this.menuItems.quickSearch,
        this.menuItems.disconnect,
        // Moved to Beekeeper Studio menu for mac
        ...(!this.platformInfo.isMac ? [this.menuItems.quit] : []),
      ]
    }

    const windowMenu: Electron.MenuItemConstructorOptions[] = []
    if (this.platformInfo.isMac) {
      windowMenu.push({
        label: 'Window',
        role: 'windowMenu'
      })
    }

    const menu = [
      ...appMenu,
      fileMenu,
      {
        id: 'edit',
        label: 'Edit',
        submenu: [
          this.menuItems.undo,
          this.menuItems.redo,
          { type: 'separator' },
          this.menuItems.cut,
          this.menuItems.copy,
          this.menuItems.paste,
          this.menuItems.selectAll,
        ]
      },
      this.viewMenu(),
      {
        id: "tools",
        label: "Tools",
        submenu: [
          this.menuItems.backupDatabase,
          this.menuItems.restoreDatabase,
          this.menuItems.exportTables,
          ...(this.bksConfig.security.lockMode === "pin" ? [this.menuItems.updatePin] : []),
          { type: 'separator' },
          this.menuItems.managePlugins,
        ]
      },
      ...windowMenu,
      this.helpMenu()
    ]

    if (this.platformInfo.isDevelopment) {
      menu.push(this.devMenu())
    }

    return menu
  }
}
