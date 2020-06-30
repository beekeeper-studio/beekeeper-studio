
import MacMenuBuilder from './menus/mac'
import LinuxMenuBuilder from './menus/linux'
// import ClientMenuHandler from './menus/ClientMenuHandler'
import platformInfo from '../common/platform_info'


export default class {
  builder = null
  electron = null

  constructor(electron, settings){
    this.electron = electron
    if (!settings.menuStyle || settings.menuStyle.value === 'native') {
      this.builder = platformInfo.platform === 'mac' ? new MacMenuBuilder(settings) : new LinuxMenuBuilder(settings)
    }
  }

  initialize() {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
      // this.handler.initialize()
    }
  }
}