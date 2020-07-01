
import MacMenuBuilder from './menus/MacMenuBuilder'
import NativeMenuBuilder from './menus/NativeMenuBuilder'
import platformInfo from '../common/platform_info'


export default class {
  builder = null
  electron = null

  constructor(electron, settings){
    this.electron = electron
    if (!settings.menuStyle || settings.menuStyle.value === 'native') {
      this.builder = platformInfo.platform === 'mac' ? new MacMenuBuilder(settings) : new NativeMenuBuilder(settings)
    }
  }

  initialize() {
    if (this.builder) {
      const template = this.builder.buildTemplate()
      this.menu = this.electron.Menu.buildFromTemplate(template)
      this.electron.Menu.setApplicationMenu(this.menu)
    } else {
      this.electron.Menu.setApplicationMenu(null)
    }
  }
}