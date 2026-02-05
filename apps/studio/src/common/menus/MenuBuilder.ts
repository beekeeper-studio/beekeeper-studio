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
        this.menuItems.fullscreen,
        this.menuItems.themeToggle,
        this.menuItems.primarySidebarToggle,
        this.menuItems.secondarySidebarToggle,
        this.menuItems.reload,
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
        this.menuItems.enterLicense,
        this.menuItems.checkForUpdate,
        this.menuItems.opendocs,
        this.menuItems.support,
        this.menuItems.addBeekeeper,
        this.menuItems.devtools,
        this.menuItems.about,
        this.menuItems.restart,
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
          { role: 'services' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
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
        this.menuItems.importSqlFiles,
        this.menuItems.quickSearch,
        this.menuItems.disconnect,
        this.menuItems.quit
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
          this.menuItems.managePlugins,
          ...(this.bksConfig.security.lockMode === "pin" ? [this.menuItems.updatePin] : [])
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
