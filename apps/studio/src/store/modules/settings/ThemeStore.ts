import Vue from 'vue';
import { Module } from 'vuex';

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    string: string;
    keyword: string;
  };
  isBuiltIn?: boolean;
}

interface ThemeState {
  availableThemes: Theme[];
  customThemes: Theme[];
}

const defaultThemes: Theme[] = [
  {
    id: 'system',
    name: 'System',
    description: 'Use system theme preference',
    colors: {
      background: '#252525',
      foreground: '#ffffff',
      string: '#a5d6ff',
      keyword: '#ff7b72'
    },
    isBuiltIn: true
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Light theme for Beekeeper Studio',
    colors: {
      background: '#ffffff',
      foreground: '#333333',
      string: '#0000ff',
      keyword: '#ff0000'
    },
    isBuiltIn: true
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Dark theme for Beekeeper Studio',
    colors: {
      background: '#252525',
      foreground: '#ffffff',
      string: '#a5d6ff',
      keyword: '#ff7b72'
    },
    isBuiltIn: true
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Solarized theme for Beekeeper Studio',
    colors: {
      background: '#fdf6e3',
      foreground: '#657b83',
      string: '#2aa198',
      keyword: '#cb4b16'
    },
    isBuiltIn: true
  },
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Solarized Dark theme for Beekeeper Studio',
    colors: {
      background: '#002b36',
      foreground: '#839496',
      string: '#2aa198',
      keyword: '#cb4b16'
    },
    isBuiltIn: true
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    description: 'GitHub dark theme for Beekeeper Studio',
    colors: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      string: '#a5d6ff',
      keyword: '#ff7b72'
    },
    isBuiltIn: true
  },
  {
    id: 'monokai',
    name: 'Monokai',
    description: 'Monokai theme for Beekeeper Studio',
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      string: '#e6db74',
      keyword: '#f92672'
    },
    isBuiltIn: true
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dracula theme for Beekeeper Studio',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      string: '#f1fa8c',
      keyword: '#ff79c6'
    },
    isBuiltIn: true
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Nord theme for Beekeeper Studio',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      string: '#a3be8c',
      keyword: '#81a1c1'
    },
    isBuiltIn: true
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    description: 'Atom\'s iconic One Dark theme',
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      string: '#98c379',
      keyword: '#c678dd'
    },
    isBuiltIn: true
  },
  {
    id: 'material-theme',
    name: 'Material Theme',
    description: 'Material Design inspired theme',
    colors: {
      background: '#263238',
      foreground: '#eeffff',
      string: '#c3e88d',
      keyword: '#c792ea'
    },
    isBuiltIn: true
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'A theme for night owls',
    colors: {
      background: '#011627',
      foreground: '#d6deeb',
      string: '#addb67',
      keyword: '#c792ea'
    },
    isBuiltIn: true
  },
  {
    id: 'winter-is-coming',
    name: 'Winter is Coming',
    description: 'Dark blue theme with vibrant colors',
    colors: {
      background: '#1d2021',
      foreground: '#cccccc',
      string: '#608b4e',
      keyword: '#569cd6'
    },
    isBuiltIn: true
  },
  {
    id: 'synthwave-84',
    name: 'SynthWave \'84',
    description: 'A neon-infused theme inspired by the 80s',
    colors: {
      background: '#262335',
      foreground: '#ffffff',
      string: '#ff8b39',
      keyword: '#f97e72'
    },
    isBuiltIn: true
  },
  {
    id: 'github-theme',
    name: 'GitHub Theme',
    description: 'GitHub\'s VS Code themes',
    colors: {
      background: '#ffffff',
      foreground: '#24292e',
      string: '#032f62',
      keyword: '#d73a49'
    },
    isBuiltIn: true
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'A clean, dark theme celebrating the lights of Downtown Tokyo',
    colors: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      string: '#9ece6a',
      keyword: '#bb9af7'
    },
    isBuiltIn: true
  },
  {
    id: 'palenight',
    name: 'Palenight',
    description: 'An elegant and juicy material-like theme',
    colors: {
      background: '#292d3e',
      foreground: '#a6accd',
      string: '#c3e88d',
      keyword: '#c792ea'
    },
    isBuiltIn: true
  },
  {
    id: 'cobalt2',
    name: 'Cobalt2',
    description: 'Wes Bos\'s Cobalt2 theme for VS Code',
    colors: {
      background: '#193549',
      foreground: '#ffffff',
      string: '#3ad900',
      keyword: '#ff9d00'
    },
    isBuiltIn: true
  },
  {
    id: 'ayu-mirage',
    name: 'Ayu Mirage',
    description: 'A simple theme with bright colors',
    colors: {
      background: '#1f2430',
      foreground: '#cbccc6',
      string: '#bae67e',
      keyword: '#ffa759'
    },
    isBuiltIn: true
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    description: 'Retro groove color scheme',
    colors: {
      background: '#282828',
      foreground: '#ebdbb2',
      string: '#b8bb26',
      keyword: '#fb4934'
    },
    isBuiltIn: true
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'A beautifully warm dark theme',
    colors: {
      background: '#1c1e26',
      foreground: '#e0e0e0',
      string: '#fab38e',
      keyword: '#e95678'
    },
    isBuiltIn: true
  },
  {
    id: 'noctis',
    name: 'Noctis',
    description: 'A collection of light & dark themes with a well balanced blend of warm and cold colors',
    colors: {
      background: '#1c2023',
      foreground: '#c5cdd9',
      string: '#7fc06e',
      keyword: '#d3423e'
    },
    isBuiltIn: true
  },
  {
    id: 'shades-of-purple',
    name: 'Shades of Purple',
    description: 'A professional theme with hand-picked & bold shades of purple',
    colors: {
      background: '#2d2b55',
      foreground: '#ffffff',
      string: '#a5ff90',
      keyword: '#ff9d00'
    },
    isBuiltIn: true
  },
  {
    id: 'panda-syntax',
    name: 'Panda Syntax',
    description: 'A Superminimal, dark Syntax Theme',
    colors: {
      background: '#292a2b',
      foreground: '#e6e6e6',
      string: '#19f9d8',
      keyword: '#ff75b5'
    },
    isBuiltIn: true
  },
  {
    id: 'city-lights',
    name: 'City Lights',
    description: 'The City Lights theme is a gorgeous dark theme designed with focus in mind',
    colors: {
      background: '#1d252c',
      foreground: '#b7c5d3',
      string: '#5ec4ff',
      keyword: '#ebbf83'
    },
    isBuiltIn: true
  },
  {
    id: 'min-dark',
    name: 'Min Dark',
    description: 'A minimal dark theme',
    colors: {
      background: '#1f1f1f',
      foreground: '#e0e0e0',
      string: '#9ccc65',
      keyword: '#42a5f5'
    },
    isBuiltIn: true
  },
  {
    id: 'eva-theme',
    name: 'Eva Theme',
    description: 'A colorful and semantic theme',
    colors: {
      background: '#2a3343',
      foreground: '#e0e0e0',
      string: '#4cd964',
      keyword: '#c594c5'
    },
    isBuiltIn: true
  }
];

const ThemeStoreModule: Module<ThemeState, any> = {
  namespaced: true,
  state: () => ({
    availableThemes: [...defaultThemes],
    customThemes: []
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
      state.customThemes.push(theme);
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
    }
  }
};

export default ThemeStoreModule; 
