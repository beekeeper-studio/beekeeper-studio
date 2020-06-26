import MenuActions from '../../common/AppEvent'
import { UserSetting } from '../../common/appdb/models/user_setting'
import AppEvent from '../../common/AppEvent'

// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class {

  app = null
  settings = {}
  constructor(electron, app, settings) {
    this.electron = electron
    this.settings = settings
    this.app = app
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
    switchTheme: async (menuItem, win) => {
      this.settings.theme.userValue = menuItem.label.toLowerCase()
      await this.settings.theme.save()
      win.webContents.send(AppEvent.settingsChanged)
    },
    switchMenuStyle: async (menuItem, win) => {
      this.settings.menuStyle.value = menuItem.label.toLowerCase()
      await this.settings.menuStyle.save()
      win.webContents.send(AppEvent.menuStyleChanged, this.settings.menuStyle)
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
                checked: this.settings.menuStyle.value === 'native'
              },
              {
                type: 'radio',
                label: 'Client',
                click: this.triggers.switchMenuStyle,
                checked: this.settings.menuStyle.value === 'client'
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
            checked: this.settings.theme.value === 'system'
          },
          {
            type: "radio",
            label: "Light",
            click: this.triggers.switchTheme,
            checked: this.settings.theme.value === 'light'
          },
          {
            type: 'radio',
            label: "Dark",
            click: this.triggers.switchTheme,
            checked: this.settings.theme.value === 'dark'
          }
        ]
      }
    }
  }

}