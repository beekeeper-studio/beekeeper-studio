import config from '../config'

export default {
  install(Vue) {
    Vue.prototype.$config = config
  }
}
