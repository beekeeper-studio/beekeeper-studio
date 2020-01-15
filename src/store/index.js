
// import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
// import VueXPersistence from 'vuex-persist'

import { UsedConnection } from '../entity/used_connection'
import { SavedConnection } from '../entity/saved_connection'
import config from '../config'

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store({
  state: {
    usedConfig: null,
    connection: null,
    database: null,
    tables: null,
    connectionConfigs: []
  },
  mutations: {
    connection(state, payload) {
      state.usedConfig = payload.config
      state.connection = payload.connection
      state.database = payload.config.defaultDatabase
    },

    clearConnection(state) {
      state.usedConfig = null
      state.connection = null
      state.database = null
    },
    database(state, newDatabase) {
      state.connection.setDatabase(newDatabase)
      state.database = newDatabase
    },
    tables(state, tables) {
      state.tables = tables
    },
    config(state, newConfig) {
      if (!state.connectionConfigs.includes(newConfig)) {
        state.connectionConfigs.push(newConfig)
      }
    },
    configs(state, configs){
      state.connectionConfigs = configs
    }
  },
  actions: {
    async setConnection(context, payload) {
      const config = payload.config
      const connection = payload.connection
      console.log(config)
      const usedConfig = new UsedConnection({
        connectionType: config.connectionType,
        defaultDatabase: config.defaultDatabase,
        port: config.port,
        path: config.path,
        url: config.uri,
      })
      await usedConfig.save()
      context.commit('connection', {config: usedConfig, connection: connection})
    },
    async disconnect(context) {
      const connection = context.state.connection
      await connection.disconnect()
      context.commit('clearConnection')
    },
    async changeDatabase(context, newDatabase) {
      context.commit('database', newDatabase)
      context.dispatch('updateTables')
    },
    async updateTables(context) {
      const tables = await context.state.connection.listTables()
      context.commit('tables', tables)
    },

    async saveConnectionConfig(context, newConfig) {
      await newConfig.save()
      context.commit('config', newConfig)
    },
    async loadSavedConfigs(context) {
      let configs = await SavedConnection.find()
      context.commit('configs', configs)
    }
  },
  plugins: [],
  devtools: config.environment == 'development'
})

export default store
