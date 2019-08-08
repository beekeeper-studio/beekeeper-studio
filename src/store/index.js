
import Vue from 'vue'
import Vuex from 'vuex'
import VueXPersistence from 'vuex-persist'
import fs from 'fs'
import path from 'path'
import config from '../config'
import shortid from 'shortid'

Vue.use(Vuex)

function fPath(key) {
  return path.join(config.userDirectory, `${key}.json`)
}

const vuexFile = new VueXPersistence({
  restoreState: (key) => {
    try {
      return JSON.parse(fs.readFileSync(fPath(key)))
    } catch(err) {
      if(err.code === 'ENOENT') {
        return null
      } else {
        throw err
      }
    }
  },
  saveState: (key, state) => fs.writeFileSync(fPath(key), JSON.stringify(state))
})


const store = new Vuex.Store({
  state: {
    connectionConfigs: {},
    queries: {},
    queryRuns: {},

  },
  mutations: {
    SAVE_CONFIG (state, config) {
      Vue.set(state.connectionConfigs, config.id, config)
    }
  },
  actions: {
    saveConnectionConfig({ commit }, config) {
      if(!config.id) {
        config.id = shortid.generate()
      }
      commit('SAVE_CONFIG', config)
      return config
    }
  },
  plugins: [vuexFile.plugin],
})

export default store
