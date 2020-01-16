
// import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
// import VueXPersistence from 'vuex-persist'

import { UsedConnection } from '../entity/used_connection'
import { SavedConnection } from '../entity/saved_connection'
import config from '../config'
import ConnectionProvider from '../lib/connection-provider'

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store({
  state: {
    usedConfig: null,
    server: null,
    connection: null,
    database: null,
    tables: null,
    connectionConfigs: []
  },
  mutations: {
    newConnection(state, payload) {
      state.server = payload.server
      state.usedConfig = payload.config
      state.connection = payload.connection
      state.database = payload.config.defaultDatabase
    },

    clearConnection(state) {
      state.usedConfig = null
      state.connection = null
      state.database = null
    },
    updateConnection(state, {connection, database}) {
      state.connection = connection
      state.database = database
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

    async test(context, config) {
      // TODO (matthew): fix this mess.
      const server = ConnectionProvider.for(config)
      await server.createConnection(config.defaultDatabase).connect()
      server.disconnect()
    },

    async connect(context, config) {
      const server = ConnectionProvider.for(config)
      const connection = await server.createConnection(config.defaultDatabase)
      await connection.connect()
      const usedConfig = new UsedConnection(config)
      await usedConfig.save()
      context.commit('newConnection', {config: usedConfig, server, connection})
    },
    async disconnect(context) {
      const server = context.state.server
      server.disconnect()
      context.commit('clearConnection')
    },
    async changeDatabase(context, newDatabase) {
      const server = context.state.server
      const connection = server.createConnection(newDatabase)
      await connection.connect()
      context.commit('updateConnection', {connection, database: newDatabase})
      await context.dispatch('updateTables')
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
