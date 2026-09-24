
import { IGroupedUserSettings, TransportUserSetting, UserSettingValueType, setValue } from '../../../common/transport/TransportUserSetting'
import _ from 'lodash'
import Vue from 'vue'
import { Module } from 'vuex'
import config from "@/config";


interface State {
  settings: IGroupedUserSettings,
  initialized: boolean
}

const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings',
}

const SettingStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    settings: {},
    initialized: false
  }),
  mutations: {
    replaceSettings(state, newSettings: TransportUserSetting) {
      const grouped = _.groupBy(newSettings, 'key')
      state.settings = _.mapValues(grouped, v => v[0]) as unknown as IGroupedUserSettings
    },
    addSetting(state, newSetting: TransportUserSetting) {
      Vue.set(state.settings, newSetting.key, newSetting)
    },
    setInitialized(state) {
      state.initialized = true;
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await Vue.prototype.$util.send('appdb/setting/find');
      context.commit(M.REPLACEALL, settings);

      context.commit('setInitialized');
    },
    async saveSetting(context, setting: TransportUserSetting) {
      await Vue.prototype.$util.send('appdb/setting/save', { obj: setting })
      context.commit(M.ADD, setting)
    },
    async save(context, { key, value }) {
      if (!key || value === undefined) return;

      const setting = context.state.settings[key] || await Vue.prototype.$util.send('appdb/setting/new');
      if (_.isBoolean(value)) setting.valueType = UserSettingValueType.boolean;
      setValue(setting, value);
      setting.key = key;
      const newSetting = await Vue.prototype.$util.send('appdb/setting/save', { obj: setting });
      _.merge(setting, newSetting);
      context.commit(M.ADD, newSetting);
    },
    async setEditResultsHintShown(context) {
      const options = { key: "editResultsHintShown", value: new Date() };
      await context.dispatch("save", options);
    },
    async setStartedEditingResult(context) {
      const options = { key: "startedEditingResult", value: new Date() };
      await context.dispatch("save", options);
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
    },
    sqliteRuntimeExtensions(state) {
      if (!state.settings.sqliteExtensionFile) return null
      return state.settings.sqliteExtensionFile
    },
    privacyMode(state) {
      if (!state.settings.privacyMode) return false;
      return state.settings.privacyMode.value;
    },
    editResultsHintShown: (state) =>
      !_.isEmpty(state.settings["editResultsHintShown"]?.value),
    startedEditingResult: (state) =>
      !_.isEmpty(state.settings["startedEditingResult"]?.value),
  },
}


export default SettingStoreModule
