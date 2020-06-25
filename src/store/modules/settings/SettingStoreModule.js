import platformInfo from "../../../common/platform_info"
import { UserSetting } from "../../../entity/user_setting"
import _ from 'lodash'

const globalDefaults = {
  theme: 'system'
}

const osDefaults = platformInfo.isLinux ? {
  theme: 'dark'
} : {}
const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings'
}

const SettingStoreModule = {
  state: () => ({
    settings: {}
  }),
  mutations: {
    replaceSettings(state, newSettings) {
      const grouped = _.groupBy(newSettings, 'key')
      state.settings = _.mapValues(grouped, v => v[0])
    },
    addsetting(state, newSetting) {
      if (!state.settings[newSetting.key]) {
        state.settings.push(newSetting)
      }
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await UserSetting.find()
      console.log('loaded settings', settings)
      context.commit(M.REPLACEALL, settings)
    },
    async saveSetting(context, setting) {
      await setting.save()
      context.commit(M.ADD, setting)
    }
  },
  getters: {
    setting(state) {
      return key => {
        return state.settings[key] || osDefaults[key] || globalDefaults[key]
      }
    }
  }
}


export default SettingStoreModule