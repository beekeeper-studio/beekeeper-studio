import { ConfigType } from "@/background/config_manager";
import { AppEvent } from "@/common/AppEvent";
import platformInfo from "@/common/platform_info";
import { ipcRenderer } from "electron";
import _ from "lodash";
import { Module } from "vuex";

interface State {
  defaultConfig: any;
  userConfig: any;
  devConfig: any;
  initialized: boolean;
}

const ConfigsStoreModule: Module<State, any> = {
  namespaced: true,
  state: () => ({
    defaultConfig: {},
    userConfig: {},
    devConfig: {},
    initialized: false,
  }),
  mutations: {
    setInitialized(state) {
      state.initialized = true;
    },
    setConfig(state, { type, config }: { type: ConfigType; config: unknown }) {
      if (type === "default") {
        state.defaultConfig = config;
      } else if (type === "dev") {
        state.devConfig = config;
      } else if (type === "user") {
        state.userConfig = config;
      }
    },
  },
  actions: {
    async initialize(context) {
      ipcRenderer.on(
        AppEvent.configChanged,
        (_, type: ConfigType, config: unknown) => {
          context.commit("setConfig", { type, config });
          context.commit("setInitialized");
        }
      );
      ipcRenderer.send(AppEvent.configStateManagerReady);
    },
    async setKeyValue(context, { key, value }) {
      context.commit("setConfig", key, value);
      ipcRenderer.send(AppEvent.saveUserConfig, context.state.userConfig);
    },
  },
  getters: {
    config(state) {
      if (platformInfo.isDevelopment) {
        return _.merge({}, state.defaultConfig, state.devConfig);
      } else {
        return _.merge({}, state.defaultConfig, state.userConfig);
      }
    },
    warnings(state) {
      const warnings: {
        type: "section" | "key";
        key: string;
      }[] = [];

      let matchConfig: any;
      if (platformInfo.isDevelopment) {
        matchConfig = state.devConfig;
      } else {
        matchConfig = state.userConfig;
      }

      for (const section in matchConfig) {
        const hasSection = Object.prototype.hasOwnProperty.call(
          state.defaultConfig,
          section
        );

        if (!hasSection) {
          warnings.push({ type: "section", key: section });
          continue;
        }

        for (const key in matchConfig[section]) {
          const hasKey = Object.prototype.hasOwnProperty.call(
            state.defaultConfig[section],
            key
          );

          if (!hasKey) {
            warnings.push({ type: "key", key: `${section}.${key}` });
          }
        }
      }

      return warnings;
    },
  },
};

export default ConfigsStoreModule;
