import { basicMenuItems } from './BasicMenuItems'
// TODO (matthew): When multi-window
// use menu switching to switch menus on the fly
//https://stackoverflow.com/questions/58044322/how-do-i-make-a-separate-menu-for-a-specific-window-in-electron
export default class {

  app = "Beekeeper Studio"
  settings = {}
  actionHandlers = {}
  constructor(settings, actionHandlers) {
    this.settings = settings
    this.actionHandlers = actionHandlers
  }

  buildTemplate() {
    throw new Error("Must implement buildTemplate for your platform")
  }

  get menuItems() {
    return {
      ...basicMenuItems(this.actionHandlers),
      newWindow: {
        id: 'new-window',
        label: "New Window",
        accelerator: "CommandOrControl+Shift+N",
        click: this.actionHandlers.newWindow
      },
      newTab: {
        id: "new-query-menu",
        label: "New Tab",
        accelerator: "CommandOrControl+T",
        click: this.actionHandlers.newQuery,
      },
      closeTab: {
        id: 'close-tab',
        label: "Close Tab",
        accelerator: "CommandOrControl+W",
        click: this.actionHandlers.closeTab
      },
      menuStyleToggle: {
        id: 'menu-style-toggle-menu',
        label: "Menu Style",
        submenu: [
          {
            id: "ms-native",
            type: 'radio',
            label: 'Native',
            click: this.actionHandlers.switchMenuStyle,
            checked: this.settings.menuStyle.value === 'native'
          },
          {
            id: "ms-client",
            type: 'radio',
            label: 'Client',
            click: this.actionHandlers.switchMenuStyle,
            checked: this.settings.menuStyle.value === 'client'
          }
        ]
      },
      themeToggle: {
        id: "theme-toggle-menu",
        label: "Theme",
        submenu: [
          {
            type: "radio",
            label: "Light",
            click: this.actionHandlers.switchTheme,
            checked: this.settings.theme.value === 'light'
          },
          {
            type: 'radio',
            label: "Dark",
            click: this.actionHandlers.switchTheme,
            checked: this.settings.theme.value === 'dark'
          }
        ]
      }
    }
}

}