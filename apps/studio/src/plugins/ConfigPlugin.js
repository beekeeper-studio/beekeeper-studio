import config from '../config'
import { initConfig } from '../config'

export default {
  install(Vue) {
    initConfig();
    Vue.prototype.$config = config
  }
}
