import Settings from '../../common/Settings'
import MenuActions from '../../common/MenuActions'

// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class {

  app = null

  /** @type {Settings} */
  settings = {}

  constructor(electron, app, settings) {
    this.electron = electron
    this.app = app
    this.settings = settings
    this.menu = electron.Menu.buildFromTemplate(this.buildTemplate())
    electron.ipcMain.on('core-loaded', () => {
      this.menuItems.newQuery.enabled = true
    }),
    electron.ipcMain.on('connection-loaded', () => {
      this.menuItems.newQuery.enabled = false
    })
  }

  buildTemplate() {
    throw new Error("Must implement buildTemplate for your platform")
  }

  triggers = {
    newQuery: (menuItem, win) => win.webContents.send('trigger-new-query'),
    switchTheme: (menuItem, win) => {
      this.settings.theme = menuItem.label.toLowerCase()
      win.webContents.send(MenuActions.THEME, this.settings.theme)
    },
    switchMenuStyle: (menuItem, win) => {
      this.settings.menuStyle = menuItem.label.toLowerCase()
      win.webContents.send(MenuActions.MENU_STYLE, this.settings.menuStyle)
    }
  }

  menuItems = {
    newQuery: () => {
      return {
        id: "new-query-menu",
        label: "New Query",
        accelerator: "CommandOrControl+T",
        click: this.triggers.newQuery,
        enabled: false
      }
    },
    menuStyleToggle: () => {
      return {
        id: 'menu-style-toggle-menu',
          label: "Menu Style",
            submenu: [
              {
                type: 'radio',
                label: 'Native',
                click: this.triggers.switchMenuStyle,
                checked: this.settings.menuStyle === 'native'
              },
              {
                type: 'radio',
                label: 'Client',
                click: this.triggers.switchMenuStyle,
                checked: this.settings.menuStyle === 'client'
              }
            ]
      }
    } ,
    themeToggle: () => {
      return {
        id: "theme-toggle-menu",
        label: "Theme",
        submenu: [
          {
            type: "radio",
            label: "System",
            click: this.triggers.switchTheme,
            checked: this.settings.theme === 'system'
          },
          {
            type: "radio",
            label: "Light",
            click: this.triggers.switchTheme,
            checked: this.settings.theme === 'light'
          },
          {
            type: 'radio',
            label: "Dark",
            click: this.triggers.switchTheme,
            checked: this.settings.theme === 'dark'
          }
        ]
      }
    }
  }

}