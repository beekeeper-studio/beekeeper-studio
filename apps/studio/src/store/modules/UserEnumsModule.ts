import { promises as fs, constants, FSWatcher, watch } from 'fs';
import * as path from 'path';
import { Module } from 'vuex';
import platformInfo from '@/common/platform_info'
import { State as RootState } from '../index'
import { UserProvidedEnum } from '@/lib/UserProvidedEnum';

interface State {
  userEnums: UserProvidedEnum[],
  watcher: FSWatcher,
  initialized: boolean
}

export const UserEnumsModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    userEnums: [],
    watcher: null,
    initialized: false
  }),
  getters: {
    enums(state) {
      return state.userEnums;
    }    
  },
  mutations: {
    setWatcher(state, watcher: FSWatcher) {
      if (state.watcher != null) state.watcher.close();
      state.watcher = watcher;
    },
    setInitialized(state) {
      state.initialized = true;
    },
    set(state, enums) {
      state.userEnums = enums;
    }
  },
  actions: {
    // TODO (day): Display an error when these fail?
    async init(context) {
      if (!platformInfo.userDirectory || context.state.initialized) return;
      const filename = path.join(platformInfo.userDirectory, 'enums.json');
      
      try {
        await fs.access(filename, constants.R_OK | constants.W_OK);
      } catch {
        // File hasn't been created yet
        return;
      }
      context.dispatch('load');
      const watcher = watch(filename, (event, _filename) => {
        if (event == 'change') {
          context.dispatch('load');
        }
      });
      context.commit('setWatcher', watcher);
      context.commit('setInitialized');
    },
    async load(context) {
      const errorPrefix = 'ENUM LOADING ERROR: ';
      const filename = path.join(platformInfo.userDirectory, 'enums.json');
      
      let enumsStr: string = null;
      try {
        enumsStr = (await fs.readFile(filename))?.toString()
      } catch (e) {
        console.error(errorPrefix, e);
        return;
      }
      
      if (!enumsStr) return;

      let json: Array<any>;
      try {
        json = JSON.parse(enumsStr);
      } catch (e) {
        console.error(errorPrefix, e)
        return;
      }

      if (!_.isArray(json)) return;

      const initializedEnums: UserProvidedEnum[] = [];
      
      for (let i = 0; i < json.length; i++) {
        const rawEnum = json[i];
        try {
          initializedEnums.push(new UserProvidedEnum(rawEnum));
        } catch (e) {
          console.error(errorPrefix, e);
        }
      }

      if (initializedEnums.length > 0) context.commit('set', initializedEnums);
      
    }
  }
}
