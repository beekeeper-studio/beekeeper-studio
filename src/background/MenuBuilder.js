
import MacMenuBuilder from './menus/mac'
import LinuxMenuBuilder from './menus/linux'
// import ClientMenuHandler from './menus/ClientMenuHandler'
import platformInfo from '../common/platform_info'


export default class {
  builder = null
  handler = null
  electron = null

  constructor(app, electron, menuStyle){
    this.electron = electron
    if (menuStyle === 'native') {
      this.builder = platformInfo.platform === 'mac' ? new MacMenuBuilder(electron, app) : new LinuxMenuBuilder(electron, app)
    }
  }

  initialize() {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
      this.handler.initialize()
    }
  }
}