import { Theme, defaultThemes } from '@/components/theme/ThemeConfigurations';
import Vue from 'vue';
import { Module } from 'vuex';

interface ThemeState {
  availableThemes: Theme[];
  customThemes: Theme[];
  showThemeManager: boolean;
  currentTheme: string;
}

const ThemeStoreModule: Module<ThemeState, any> = {
  namespaced: true,
  state: () => ({
    availableThemes: [...defaultThemes],
    customThemes: [],
    showThemeManager: false,
    currentTheme: ''
  }),
  mutations: {
    ADD_THEME(state, theme: Theme) {
      const existingIndex = state.availableThemes.findIndex(t => t.id === theme.id);
      if (existingIndex >= 0) {
        Vue.set(state.availableThemes, existingIndex, theme);
      } else {
        state.availableThemes.push(theme);
      }
    },
    ADD_CUSTOM_THEME(state, theme: Theme) {
      const existingCustomIndex = state.customThemes.findIndex(t => t.id === theme.id);
      if (existingCustomIndex >= 0) {
        Vue.set(state.customThemes, existingCustomIndex, theme);
      } else {
        state.customThemes.push(theme);
      }

      const existingIndex = state.availableThemes.findIndex(t => t.id === theme.id);
      if (existingIndex >= 0) {
        Vue.set(state.availableThemes, existingIndex, theme);
      } else {
        state.availableThemes.push(theme);
      }
    },
    REMOVE_THEME(state, themeId: string) {
      state.availableThemes = state.availableThemes.filter(t => t.id !== themeId);
      state.customThemes = state.customThemes.filter(t => t.id !== themeId);
    },
    SET_SHOW_THEME_MANAGER(state, value: boolean) {
      state.showThemeManager = value;
    },
    SET_CURRENT_THEME(state, theme) {
      console.log(`[ThemeStore] Setting current theme: ${theme.id}`);

      // Store the theme ID in state
      state.currentTheme = theme.id;

      // Update available themes to ensure the theme is included
      const existingIndex = state.availableThemes.findIndex(t => t.id === theme.id);
      if (existingIndex >= 0) {
        Vue.set(state.availableThemes, existingIndex, theme);
      } else {
        // Add to available themes if it's not there
        state.availableThemes.push(theme);
      }

      // If it's a custom theme, also update the customThemes array
      if (!['system', 'light', 'dark', 'solarized', 'solarized-dark'].includes(theme.id)) {
        const customIndex = state.customThemes.findIndex(t => t.id === theme.id);
        if (customIndex >= 0) {
          Vue.set(state.customThemes, customIndex, theme);
        } else {
          state.customThemes.push(theme);
        }
      }
    }
  },
  actions: {
    addTheme({ commit }, theme: Theme) {
      commit('ADD_THEME', theme);
    },
    addCustomTheme({ commit }, theme: Theme) {
      commit('ADD_CUSTOM_THEME', theme);
    },
    removeTheme({ commit }, themeId: string) {
      commit('REMOVE_THEME', themeId);
    },
    showThemeManager({ commit }) {
      commit('SET_SHOW_THEME_MANAGER', true);
    },
    hideThemeManager({ commit }) {
      commit('SET_SHOW_THEME_MANAGER', false);
    },
    toggleThemeManager({ commit, state }) {
      commit('SET_SHOW_THEME_MANAGER', !state.showThemeManager);
    },
    async fetchThemes({ commit, state }) {
      console.log('Fetching themes');

      // First, ensure we have all the default themes
      defaultThemes.forEach(theme => {
        const existingIndex = state.availableThemes.findIndex(t => t.id === theme.id);
        if (existingIndex < 0) {
          commit('ADD_THEME', theme);
        }
      });

      // If we're in an electron environment, fetch custom themes
      if (window.electron && window.electron.ipcRenderer) {
        try {
          const result = await (window.electron.ipcRenderer as any).invoke('themes/list');

          if (result.success && result.themes) {
            console.log(`Fetched ${result.themes.length} custom themes`);

            result.themes.forEach(theme => {
              // Add isBuiltIn: false to custom themes
              const customTheme = {
                ...theme,
                isBuiltIn: false
              };

              commit('ADD_CUSTOM_THEME', customTheme);
            });
          }
        } catch (error) {
          console.error('Error fetching custom themes:', error);
        }
      }

      return state.availableThemes;
    },
    setCurrentTheme({ commit }, theme) {
      console.log(`[ThemeStore] setCurrentTheme action called with theme: ${theme.id}`);
      commit('SET_CURRENT_THEME', theme);

      // Return a promise to allow async/await usage
      return Promise.resolve(theme);
    }
  },
  getters: {
    allThemes(state) {
      return state.availableThemes;
    },
    builtInThemes(state) {
      return state.availableThemes.filter(theme => theme.isBuiltIn);
    },
    customThemes(state) {
      return state.customThemes;
    },
    isThemeManagerVisible(state) {
      return state.showThemeManager;
    },
    currentTheme(state) {
      return state.currentTheme;
    }
  }
};

export default ThemeStoreModule; 
