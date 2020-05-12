
import { Menu } from 'electron'

function configureMacMenu(app) {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function configureDefaultMenu() {
  Menu.setApplicationMenu(null)
}

export function configureMenu(app, platform, debugOrDev) {
  if (platform == 'mac') {
    return configureMacMenu(app)
  }
  if (!debugOrDev) {
    return configureDefaultMenu()
  }
}
