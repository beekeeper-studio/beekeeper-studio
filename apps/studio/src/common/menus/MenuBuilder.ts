import DefaultMenu from './BaseMenuBuilder'
import platformInfo from '../platform_info'
import { IGroupedUserSettings } from '../appdb/models/user_setting'
import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler'

export default class extends DefaultMenu {
  constructor(settings: IGroupedUserSettings, handler: IMenuActionHandler) {
    super(settings, handler)
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
        this.menuItems.sidebarToggle
      ]
    }
    if (!platformInfo.isMac)
      (result.submenu as Electron.MenuItemConstructorOptions[]).push(this.menuItems.menuStyleToggle)
    if (platformInfo.environment === 'development')
      (result.submenu as Electron.MenuItemConstructorOptions[]).push(this.menuItems.reload)
    return result
  }

  buildTemplate(): Electron.MenuItemConstructorOptions[] {
    const appMenu: Electron.MenuItemConstructorOptions[] = []
    if (platformInfo.isMac) {
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
        this.menuItems.disconnect,
        this.menuItems.quit
      ]
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
        label: "Help",
        submenu: [
          this.menuItems.about,
          this.menuItems.addBeekeeper,
          this.menuItems.devtools,
        ]
      }
    ]
  }
}
