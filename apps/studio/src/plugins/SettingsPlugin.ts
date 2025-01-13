import Vue from 'vue';
import rawLog from '@bksLogger'

const log = rawLog.scope('settings-plugin')

export const SettingsPlugin = {

  async get(key: string, defaultValue?: any) {
    const result = await Vue.prototype.$util.send('appdb/setting/get', { key });
    log.info("get", JSON.stringify(result))
    if (result) {
      return result.value
    }
    return defaultValue || null
  },

  async set(key: string, value: string) {
    log.info("set", key, value)
    await Vue.prototype.$util.send('appdb/setting/set', { key, value });
  }
}


export default {
  install(Vue) {
    Vue.prototype.$settings = SettingsPlugin
  }
}
