import Vue from 'vue';
import rawLog from '@bksLogger'

const log = rawLog.scope('settings-plugin')

export const SettingsPlugin = {

  async get(key, defaultValue) {
    const result = await Vue.prototype.$util.send('appdb/setting/get', { key });
    log.debug("get", key, { found: result?.value !== undefined });
    if (result && result.value !== undefined) {
      return result.value
    }
    return defaultValue;
  },

  async set(key: string, value: string) {
    log.debug("set", key);
    await Vue.prototype.$util.send('appdb/setting/set', { key, value });
  }
}


export default {
  install(Vue) {
    Vue.prototype.$settings = SettingsPlugin
  }
}
