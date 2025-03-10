import config from "@/config";
import _ from 'lodash';
import Vue from 'vue';
import { Module } from 'vuex';
import { IGroupedUserSettings, TransportUserSetting, UserSettingValueType, setValue } from '../../../common/transport/TransportUserSetting';

// Define the keymap types
type KeymapType = "default" | "vim";

interface State {
  settings: IGroupedUserSettings,
  initialized: boolean,
  privacyMode: boolean
}

const M = {
  ADD: 'addSetting',
  REPLACEALL: 'replaceSettings',
  SET_THEME: 'SET_THEME',
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
    },
    SET_THEME(state, themeId: string) {
      setValue(state.settings.theme, themeId as any);

      // Apply the theme class to the document body
      document.body.className = `theme-${themeId}`;

      // Apply the theme CSS via IPC if available
      if (window.electron && window.electron.ipcRenderer) {
        console.log(`Applying theme CSS for ${themeId} via IPC`);
        // Use type assertion to bypass TypeScript checking
        (window.electron.ipcRenderer as any).send('themes/apply', { name: themeId });
      }
    }
  },
  actions: {
    async initializeSettings(context) {
      const settings = await Vue.prototype.$util.send('appdb/setting/find');
      context.commit(M.REPLACEALL, settings);
      context.commit('setInitialized');

      // Apply the theme from settings when the app starts
      const themeValue = context.getters.themeValue;
      if (themeValue) {
        console.log(`Initializing with theme: ${themeValue}`);
        // Apply the theme to the UI
        document.body.className = `theme-${themeValue}`;
      }
    },
    async saveSetting(context, setting: TransportUserSetting) {
      await Vue.prototype.$util.send('appdb/setting/save', { obj: setting })
      context.commit(M.ADD, setting)
    },
    async save(context, { key, value }) {
      if (!key) return;
      const setting = context.state.settings[key] || await Vue.prototype.$util.send('appdb/setting/new');
      if (_.isBoolean(value)) setting.valueType = UserSettingValueType.boolean;
      setValue(setting, value);
      setting.key = key;
      const newSetting = await Vue.prototype.$util.send('appdb/setting/save', { obj: setting });
      _.merge(setting, newSetting);
      context.commit(M.ADD, setting);

      // If this is a theme setting, also update the theme state
      if (key === 'theme' && typeof value === 'string') {
        context.commit(M.SET_THEME, value);
      }
    },
    togglePrivacyMode({ commit, state }) {
      const newPrivacyMode = !state.privacyMode;
      commit('SET_PRIVACY_MODE', newPrivacyMode);
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
    /** The keymap type to be used in text editor */
    userKeymap(state): KeymapType {
      const value = state.settings.keymap?.value as string;
      return value && config.defaults.keymapTypes.map((k) => k.value).includes(value as any)
        ? (value as KeymapType)
        : "default" as KeymapType;
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
