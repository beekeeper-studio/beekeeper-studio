import { Example, Mysqlexamples as MysqlExamples, PostgresExamples, RedshiftExamples, SqliteExamples, SqlServerExamples } from "@/data/examples";
import { Dialect, Dialects, KnexDialect } from "@shared/lib/dialects/models";
import Vue from "vue";
import Vuex from 'vuex'
import VuexPersistence from "vuex-persist";


Vue.use(Vuex)


type ExampleMap = {
  [K in Dialect]: Example[]
}

export interface State {
  dialect: Dialect
  dismissedTutorial: boolean
  dialects: Dialect[]
  examples: ExampleMap
}


const vuexLocal = new VuexPersistence<State>({
  storage: window.localStorage,
  reducer: (state) => ({dialect: state.dialect, dismissedTutorial: state.dismissedTutorial})
})



export default new Vuex.Store<State>({
  state: {
    dialect: 'postgresql',
    dismissedTutorial: false,
    dialects: [...Dialects],
    examples: {
      'postgresql': PostgresExamples,
      'mysql': MysqlExamples,
      'sqlite': SqliteExamples,
      'sqlserver': SqlServerExamples,
      'redshift': RedshiftExamples
    }
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