
import { IGroupedUserSettings, TransportUserSetting, UserSettingValueType, setValue } from '../../../common/transport/TransportUserSetting'
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
    replaceSettings(state, newSettings: TransportUserSetting) {
      const grouped = _.groupBy(newSettings, 'key')
      state.settings = _.mapValues(grouped, v => v[0]) as unknown as IGroupedUserSettings
    },
    addSetting(state, newSetting: TransportUserSetting) {
      if (!state.settings[newSetting.key]) {
        Vue.set(state.settings, newSetting.key, newSetting)
      }
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await Vue.prototype.$util.send('appdb/setting/find');
      context.commit(M.REPLACEALL, settings)
    },
    async saveSetting(context, setting: TransportUserSetting) {
      await Vue.prototype.$util.send('appdb/setting/save', { obj: setting })
      context.commit(M.ADD, setting)
    },
    async save(context, { key, value }) {
      if (!key || !value) return;
      const setting = context.state.settings[key] || await Vue.prototype.$util.send('appdb/setting/new');
      if (_.isBoolean(value)) setting.valueType = UserSettingValueType.boolean;
      setValue(setting, value);
      setting.key = key
      await Vue.prototype.$util.send('appdb/setting/save', { obj: setting });
      context.commit(M.ADD, setting)
    }
  },
  getters: {
    settings(state) {
      return state.settings
    },
    themeValue(state) {
      const theme = state.settings.theme ? state.settings.theme.value : null;
      if (!theme) return null
      if (['system', 'dark', 'light'].includes(theme as string)) {
        return theme
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
      if (!state.settings.minimalMode) return false;
      return state.settings.minimalMode.value
    },
  }
}


export default SettingStoreModule
