import { buildConfig } from '../config'

export default {
  install(Vue) {
    Vue.prototype.$config = buildConfig(window.platformInfo)
  }
}
