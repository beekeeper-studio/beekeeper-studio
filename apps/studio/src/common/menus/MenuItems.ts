import { IMenuActionHandler } from '@/common/interfaces/IMenuActionHandler';
import { IGroupedUserSettings } from '../appdb/models/user_setting';
import platformInfo from "../platform_info";

interface IMenuItems {
  [x: string]: Electron.MenuItemConstructorOptions
}

export function menuItems(actionHandler: IMenuActionHandler, settings: IGroupedUserSettings): IMenuItems {
  return {
    quit: {
      id: 'quit',
      label: platformInfo.isMac ? 'Quit' : 'Exit',
      accelerator: platformInfo.isMac ? 'CommandOrControl+Q' : undefined,
      click: actionHandler.quit
    },
    undo: {
      id: 'undo',
      label: "Undo",
      accelerator: "CommandOrControl+Z",
      click: actionHandler.undo
    },
    redo: {
      id: "redo",
      label: "Redo",
      accelerator: platformInfo.isWindows ? 'Ctrl+Y' : 'Shift+CommandOrControl+Z',
      click: actionHandler.redo
    },
    cut: {
      id: 'cut',
      label: 'Cut',
      accelerator: 'CommandOrControl+X',
      click: actionHandler.cut,
      registerAccelerator: false

    },
    copy: {
      id: 'copy',
      label: 'Copy',
      accelerator: 'CommandOrControl+C',
      click: actionHandler.copy,
      registerAccelerator: false
    },
    paste: {
      id: 'paste',
      label: 'Paste',
      accelerator: 'CommandOrControl+V',
      click: actionHandler.paste,
      registerAccelerator: false
    },

    selectAll: {
      id: 'select-all',
      label: 'Select All',
      accelerator: 'CommandOrControl+A',
      click: actionHandler.selectAll
    },
    // view
    zoomreset: {
      id: 'zoom-reset',
      label: "Reset Zoom",
      accelerator: "CommandOrControl+0",
      click: actionHandler.zoomreset
    },
    zoomin: {
      id: 'zoom-in',
      label: "Zoom In",
      accelerator: 'CommandOrControl+=',
      click: actionHandler.zoomin
    },
    zoomout: {
      id: 'zoom-out',
      label: "Zoom Out",
      accelerator: "CommandOrControl+-",
      click: actionHandler.zoomout
    },
    fullscreen: {
      id: 'fullscreen',
      label: "Toggle Full Screen",
      accelerator: platformInfo.isMac ? 'Shift+CommandOrControl+F' : 'F11',
      click: actionHandler.fullscreen
    },
    // help
    about: {
      id: 'about',
      label: 'About Beekeeper Studio',
      click: actionHandler.about
    },
    devtools: {
      id: 'dev-tools',
      label: "Show Developer Tools",
      // @ts-ignore
      nonNativeMacOSRole: true,
      click: actionHandler.devtools
    },
    opendocs : {
      id: 'opendocs',
      label: 'Documentation and Support',
      click: actionHandler.opendocs
    },
    reload: {
      id: 'reload-window',
      label: "DEV Force Reload",
      accelerator: "CommandOrControl+Shift+R",
      click: actionHandler.reload
    },
    newWindow: {
      id: 'new-window',
      label: "New Window",
      accelerator: "CommandOrControl+Shift+N",
      click: actionHandler.newWindow
    },
    addBeekeeper: {
      id: 'add-beekeeper',
      label: "Add Beekeeper's Database",
      click: actionHandler.addBeekeeper
    },
    newTab: {
      id: "new-query-menu",
      label: "New Tab",
      accelerator: "CommandOrControl+T",
      click: actionHandler.newQuery,
    },
    closeTab: {
      id: 'close-tab',
      label: "Close Tab",
      accelerator: "CommandOrControl+W",
      click: actionHandler.closeTab,
      registerAccelerator: false
    },
    quickSearch: {
      id: 'go-to',
      label: "Quick Search",
      accelerator: "CommandOrControl+P",
      registerAccelerator: false,
      click: actionHandler.quickSearch
    },
    disconnect: {
      id: 'disconnect',
      label: "Disconnect",
      click: actionHandler.disconnect
    },
    sidebarToggle: {
      id: 'menu-toggle-sidebar',
      label: 'Toggle Sidebar',
      accelerator: "Alt+S",
      click: actionHandler.toggleSidebar,
    },
    menuStyleToggle: {
      id: 'menu-style-toggle-menu',
      label: "Menu Style",
      submenu: [
        {
          id: "ms-native",
          type: 'radio',
          label: 'Native',
          click: actionHandler.switchMenuStyle,
          checked: settings.menuStyle.value === 'native'
        },
        {
          id: "ms-client",
          type: 'radio',
          label: 'Client',
          click: actionHandler.switchMenuStyle,
          checked: settings.menuStyle.value === 'client'
        }
      ]
    },
    themeToggle: {
      id: "theme-toggle-menu",
      label: "Theme",
      submenu: [
        {
          type: 'radio',
          label: "System",
          click: actionHandler.switchTheme,
          checked: settings.theme.value === 'system'
        },
        {
          type: "radio",
          label: "Light",
          click: actionHandler.switchTheme,
          checked: settings.theme.value === 'light'
        },
        {
          type: 'radio',
          label: "Dark",
          click: actionHandler.switchTheme,
          checked: settings.theme.value === 'dark'
        }
      ]
    }
  }
}
