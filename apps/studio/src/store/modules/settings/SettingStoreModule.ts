
import { IGroupedUserSettings, TransportUserSetting, UserSettingValueType, setValue } from '../../../common/transport/TransportUserSetting'
import _ from 'lodash'
import Vue from 'vue'
import { Module } from 'vuex'
import config from "@/config";


interface State {
  settings: IGroupedUserSettings,
  initialized: boolean,
  privacyMode: boolean
}

const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings',
}

const SettingStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    settings: {},
    initialized: false,
    privacyMode: false
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
    },
    setInitialized(state) {
      state.initialized = true;
    },
    SET_PRIVACY_MODE(state, value: boolean) {
      state.privacyMode = value;
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await Vue.prototype.$util.send('appdb/setting/find');
      context.commit(M.REPLACEALL, settings);
      
      const privacyModeSetting = settings.find(s => s.key === 'privacyMode');
      if (privacyModeSetting) {
        context.commit('SET_PRIVACY_MODE', privacyModeSetting.value);
      }
      
      context.commit('setInitialized');
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
      setting.key = key;
      const newSetting = await Vue.prototype.$util.send('appdb/setting/save', { obj: setting });
      _.merge(setting, newSetting);
      context.commit(M.ADD, setting);
    },
    async togglePrivacyMode({ commit, state, dispatch }) {
      const newPrivacyMode = !state.privacyMode;
      commit('SET_PRIVACY_MODE', newPrivacyMode);
      await dispatch('save', { key: 'privacyMode', value: newPrivacyMode });
    },
  },
  getters: {
    settings(state) {
      return state.settings
    },
    themeValue(state) {
      const theme = state.settings.theme ? state.settings.theme.value : null;
      if (!theme) return null
      return theme;
    },
    /** is the theme light or dark? */
    themeType(_state, getters) {
      if (!getters.themeValue) return 'light'
      if (getters.themeValue.includes('dark')) return 'dark'
      return 'light'
    },
    /** The keymap type to be used in text editor */
    userKeymap(state) {
      const value = state.settings.keymap?.value as string;
      return value && config.defaults.keymapTypes.map((k) => k.value).includes(value)
        ? value
        : "default";
    },
    sortOrder(state) {
      if (!state.settings.sortOrder) return 'id'
      return state.settings.sortOrder.value
    },
    minimalMode(_state) {
      // Disable minimal mode in favor of #2380
      return false
      // if (!state.settings.minimalMode) return false;
      // return state.settings.minimalMode.value
    },
    lastUsedWorkspace(state) {
      if (!state.settings.lastUsedWorkspace) return null;
      return state.settings.lastUsedWorkspace
    }
  }
}


export default SettingStoreModule
