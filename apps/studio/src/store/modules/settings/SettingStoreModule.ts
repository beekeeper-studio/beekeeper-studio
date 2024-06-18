
import { IGroupedUserSettings, UserSetting, UserSettingValueType } from '../../../common/appdb/models/user_setting'
import _ from 'lodash'
import Vue from 'vue'
import { Module } from 'vuex'


interface State {
  settings: IGroupedUserSettings
}

const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings',
}

const SettingStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    settings: {},
  }),
  mutations: {
    replaceSettings(state, newSettings: UserSetting) {
      const grouped = _.groupBy(newSettings, 'key')
      state.settings = _.mapValues(grouped, v => v[0]) as IGroupedUserSettings
    },
    addSetting(state, newSetting: UserSetting) {
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
    async saveSetting(context, setting: UserSetting) {
      await setting.save()
      context.commit(M.ADD, setting)
    },
    async save(context, { key, value }) {
      if (!key || !value) return;
      const setting = context.state.settings[key] || new UserSetting()
      if (_.isBoolean(value)) setting.valueType = UserSettingValueType.boolean;
      setting.value = value
      setting.key = key
      await setting.save()
      context.commit(M.ADD, setting)
    }
  },
  getters: {
    settings(state) {
      return state.settings
    },
    themeValue(state) {
      if (!state.settings.theme.value) return null
      if (['system', 'dark', 'light'].includes(state.settings.theme.value as string)) {
        return state.settings.theme.value
      }
      return 'system'
    },
    menuStyle(state) {
      if (!state.settings.menuStyle) return 'native'
      return state.settings.menuStyle.value
    },
    sortOrder(state) {
      if (!state.settings.sortOrder) return 'id'
      return state.settings.sortOrder.value
    },
    minimalMode(state) {
      return state.settings.minimalMode.value
    },
  }
}


export default SettingStoreModule
