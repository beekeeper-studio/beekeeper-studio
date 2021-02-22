import wrapper from '../lib/NativeWrapper'

export default {
  install(Vue) {
    Vue.prototype.$native = wrapper
  }
}
