import DefaultMenu from './BaseMenuBuilder'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'
import { IGroupedUserSettings } from '../transport/TransportUserSetting'
import { IPlatformInfo } from '../IPlatformInfo'

export default class extends DefaultMenu {
  constructor(settings: IGroupedUserSettings, handler: IMenuActionHandler, platformInfo: IPlatformInfo) {
    super(settings, handler, platformInfo)
  }

  viewMenu(): Electron.MenuItemConstructorOptions {
    const result: Electron.MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        this.menuItems.zoomreset,
        this.menuItems.zoomin,
        this.menuItems.zoomout,
        this.menuItems.fullscreen,
        this.menuItems.themeToggle,
        this.menuItems.sidebarToggle,
        this.menuItems.minimalModeToggle,
      ]
    }
    if (!this.platformInfo.isMac)
      (result.submenu as Electron.MenuItemConstructorOptions[]).push(this.menuItems.menuStyleToggle)
    if (this.platformInfo.isDevelopment)
      (result.submenu as Electron.MenuItemConstructorOptions[]).push(this.menuItems.reload)
    return result
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
    console.log("Menu style", this.settings.menuStyle)
    if ((this.platformInfo.isMac || this.settings.menuStyle.value === 'native') && !this.platformInfo.isWayland) {
      windowMenu.push({
        label: 'Window',
        role: 'windowMenu'
      })
    }

    return [
      ...appMenu,
      fileMenu,
      {
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
        label: "Tools",
        submenu: [
          this.menuItems.upgradeModal("Data Export"),
          this.menuItems.upgradeModal("Create a Backup"),
          this.menuItems.upgradeModal("Restore a Backup")
        ]
      },
      ...windowMenu,
      {
        label: "Help",
        submenu: [
          this.menuItems.opendocs,
          this.menuItems.checkForUpdate,
          this.menuItems.addBeekeeper,
          this.menuItems.devtools,
          this.menuItems.about,
        ]
      }
    ]
  }
}
