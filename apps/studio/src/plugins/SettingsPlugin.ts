import Vue from 'vue';



export const SettingsPlugin = {

  async get(key: string, defaultValue?: any) {
    const result = await Vue.prototype.$util.send('appdb/setting/get', { key });
    if (result) {
      return result.value
    }
    return defaultValue || null
  },

  async set(key: string, value: string) {
    await Vue.prototype.$util.send('appdb/setting/set', { key, value });
  }
}


export default {
  install(Vue) {
    Vue.prototype.$settings = SettingsPlugin
  }
}
