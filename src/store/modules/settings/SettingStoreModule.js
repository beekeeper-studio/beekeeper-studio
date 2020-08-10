
import { UserSetting } from '../../../common/appdb/models/user_setting'
import _ from 'lodash'
import Vue from 'vue'

const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings',
}

const SettingStoreModule = {
  namespaced: true,
  state: () => ({
    settings: {},
  }),
  mutations: {
    replaceSettings(state, newSettings) {
      const grouped = _.groupBy(newSettings, 'key')
      state.settings = _.mapValues(grouped, v => v[0])
    },
    addsetting(state, newSetting) {
      if (!state.settings[newSetting.key]) {
        Vue.set(state.settings, newSetting.key, newSetting)
      }
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await UserSetting.find()
      context.commit(M.REPLACEALL, settings)
    },
    async saveSetting(context, setting) {
      await setting.save()
      context.commit(M.ADD, setting)
    },
  },
  getters: {
    settings(state) {
      return state.settings
    },
    themeValue(state) {
      if (!state.settings.theme) return null
      if (['dark', 'light'].includes(state.settings.theme.value)) {
        return state.settings.theme.value
      }
      return 'dark'
    },
    menuStyle(state) {
      if (!state.settings.menuStyle) return 'native'
      return state.settings.menuStyle.value
    }
  }
}


export default SettingStoreModule
