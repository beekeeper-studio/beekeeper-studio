import { Dialect, Dialects, KnexDialect } from "@shared/lib/dialects/models";
import Vue from "vue";
import Vuex from 'vuex'
import VuexPersistence from "vuex-persist";


Vue.use(Vuex)

interface State {
  dialect: Dialect
  dismissedTutorial: boolean
}


const vuexLocal = new VuexPersistence<State>({
  storage: window.localStorage
})



export default new Vuex.Store<State>({
  state: {
    dialect: 'postgresql',
    dismissedTutorial: false
  },
  getters: {
    knexDialect(state): KnexDialect {
      return KnexDialect(state.dialect)
    }
  },
  mutations: {
    setDialect(state, dialect: Dialect) {
      if (Dialects.includes(dialect)) {
        state.dialect = dialect
      }
    },
    setDismissedTutorial(state) {
      state.dismissedTutorial = true
    }
  },
  plugins: [vuexLocal.plugin]
})