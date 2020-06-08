
import { Menu } from 'electron'
import MacMenuBuilder from './menus/mac'

function configureDefaultMenu() {
  Menu.setApplicationMenu(null)
}

export function configureMenu(app, settings, platform, debugOrDev) {
  
  if (platform == 'mac') {
    const builder = new MacMenuBuilder(app, settings) 
    const template = builder.buildTemplate()
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }
  if (!debugOrDev) {
    return configureDefaultMenu()
  }
}
