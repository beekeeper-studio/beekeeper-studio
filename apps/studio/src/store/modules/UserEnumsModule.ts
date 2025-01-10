import { Module } from 'vuex';
import { State as RootState } from '../index'
import { UserProvidedEnum } from '@/lib/UserProvidedEnum';
import Vue from 'vue';

interface State {
  userEnums: UserProvidedEnum[],
}

export const UserEnumsModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    userEnums: [],
  }),
  getters: {
    enums(state) {
      return state.userEnums;
    }    
  },
  mutations: {
    set(state, enums) {
      state.userEnums = enums;
    }
  },
  actions: {
    // TODO (day): Display an error when these fail?
    async init(context) {
      Vue.prototype.$util.addListener('enumFileChanged', () => {
        context.dispatch('load');
      })
      await Vue.prototype.$util.send('enum/init');
      await context.dispatch('load');
    },
    async load(context) {
      const rawEnums = await Vue.prototype.$util.send('enum/load')

      const initializedEnums: UserProvidedEnum[] = [];
  
      for (let i = 0; i < rawEnums.length; i++) {
        const rawEnum = rawEnums[i];
        try {
          initializedEnums.push(new UserProvidedEnum(rawEnum));
        } catch (e) {
          console.error('ENUM LOADING ERROR', e);
        }
      }

      if (initializedEnums.length > 0) context.commit('set', initializedEnums);
    }
  }
}
