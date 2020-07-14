import platformInfo from "../platform_info";


export function basicMenuItems(actionHandler) {
  return {
    quit: {
      id: 'quit',
      label: platformInfo.isMac ? 'Quit' : 'Exit',
      accelerator: platformInfo.isMac ? 'Ctrl+Q' : undefined,
      click: actionHandler.quit
    },
    undo: {
      id: 'undo',
      label: "Undo",
      accelerator: "Ctrl+Z",
      click: actionHandler.undo
    },
    redo: {
      id: "redo",
      label: "Redo",
      accelerator: platformInfo.isWindows ? 'Ctrl+Y' : 'Shift+Ctrl+Z',
      click: actionHandler.redo
    },
    cut: {
      id: 'cut',
      label: 'Cut',
      accelerator: 'Ctrl+X',
      click: actionHandler.cut,
      registerAccelerator: false

    },
    copy: {
      id: 'copy',
      label: 'Copy',
      accelerator: 'Ctrl+C',
      click: actionHandler.copy,
      registerAccelerator: false
    },
    paste: {
      id: 'paste',
      label: 'Paste',
      accelerator: 'Ctrl+V',
      click: actionHandler.paste,
      registerAccelerator: false
    },

    selectAll: {
      id: 'select-all',
      label: 'Select All',
      accelerator: 'Ctrl+A',
      click: actionHandler.selectAll
    },
    // view
    zoomreset: {
      id: 'zoom-reset',
      label: "Reset Zoom",
      accelerator: "Ctrl+0",
      click: actionHandler.zoomreset
    },
    zoomin: {
      id: 'zoom-in',
      label: "Zoom In",
      accelerator: 'Ctrl+=',
      click: actionHandler.zoomin
    },
    zoomout: {
      id: 'zoom-out',
      label: "Zoom Out",
      accelerator: "Ctrl+-",
      click: actionHandler.zoomout
    },
    fullscreen: {
      id: 'fullscreen',
      label: "Toggle Full Screen",
      accelerator: platformInfo.isMac ? 'Ctrl+F' : 'F11',
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
      accelerator: 'F12',
      nonNativeMacOSRole: true,
      click: actionHandler.devtools
    },
    reload: {
      id: 'reload-window',
      label: "DEV Force Reload",
      accelerator: "Ctrl+Shift+R",
      click: actionHandler.reload
    }

  }
}