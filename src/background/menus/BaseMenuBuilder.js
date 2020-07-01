import AppEvent from '../../common/AppEvent'

// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class {

  app = null
  settings = {}
  constructor(settings) {
    this.settings = settings
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
      console.log("sending event", AppEvent.menuStyleChanged)
      win.webContents.send(AppEvent.menuStyleChanged)
    }
  }

  menuItems = {
    newQuery: () => {
      return {
        id: "new-query-menu",
        label: "New Query",
        accelerator: "CommandOrControl+T",
        click: this.triggers.newQuery,
        enabled: true
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