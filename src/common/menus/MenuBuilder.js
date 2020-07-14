import DefaultMenu from './BaseMenuBuilder'
import platformInfo from '../platform_info'

export default class extends DefaultMenu {
  constructor(settings, handler) {
    super(settings, handler)
  }


  viewMenu() {
    const result = {
      label: 'View',
        submenu: [
          this.menuItems.zoomreset,
          this.menuItems.zoomin,
          this.menuItems.zoomout,
          this.menuItems.fullscreen,
          this.menuItems.themeToggle,
        ]
    }
    if(!platformInfo.isMac) result.submenu.push(this.menuItems.menuStyleToggle)
    if (platformInfo.environment === 'development') result.submenu.push(this.menuItems.reload)
    return result
  }

  buildTemplate() {
    const appMenu = []
    if (platformInfo.isMac) {
      appMenu.push({
        label: "Beekeeper Studio",
        submenu: [
          this.menuItems.about,
          { role: 'services' },
          { role: 'hide' },
          { role: 'hideothers' },
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