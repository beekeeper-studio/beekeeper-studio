import { Dialect, Dialects, KnexDialect } from "@shared/lib/dialects/models";
import Vue from "vue";
import Vuex from 'vuex'

Vue.use(Vuex)

interface State {
  dialect: Dialect
}
export default new Vuex.Store<State>({
  state: {
    dialect: 'postgresql'
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
    }
  }
})