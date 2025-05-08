import { Module } from 'vuex';

interface UIState {
  showThemeManager: boolean;
}

const uiModule: Module<UIState, any> = {
  namespaced: true,
  state: () => ({
    showThemeManager: false,
  }),
  mutations: {
    SET_SHOW_THEME_MANAGER(state, value: boolean) {
      state.showThemeManager = value;
    },
  },
  actions: {
    showThemeManager({ commit }) {
      commit('SET_SHOW_THEME_MANAGER', true);
    },
    hideThemeManager({ commit }) {
      commit('SET_SHOW_THEME_MANAGER', false);
    },
  },
};

export default uiModule;
