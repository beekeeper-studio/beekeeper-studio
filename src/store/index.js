
import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
// import VueXPersistence from 'vuex-persist'

import { UsedConnection } from '@/entity/used_connection'
import { SavedConnection } from '@/entity/saved_connection'
import { FavoriteQuery } from '@/entity/favorite_query'
import { UsedQuery } from '@/entity/used_query'
import config from '@/config'
import ConnectionProvider from '@/lib/connection-provider'

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store({
  state: {
    usedConfig: null,
    server: null,
    connection: null,
    database: null,
    tables: [],
    pinStore: {},
    connectionConfigs: [],
    history: [],
    favorites: []
  },
  getters: {
    pinned(state) {
      const result = state.pinStore[state.database]
      return _.isNil(result) ? [] : result
    }
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
    addPinned(state, table) {
      if (_.isNil(state.pinStore[state.database])) {
        Vue.set(state.pinStore, state.database, [])
      }
      if (!state.pinStore[state.database].includes(table)) {
        state.pinStore[state.database].push(table)
      }
    },
    removePinned(state, table) {
      if(_.isNil(state.pinStore[state.database])) {
        return
      }
      Vue.set(state.pinStore, state.database, _.without(state.pinStore[state.database], table))
    },
    config(state, newConfig) {
      if (!state.connectionConfigs.includes(newConfig)) {
        state.connectionConfigs.push(newConfig)
      }
    },
    configs(state, configs){
      state.connectionConfigs = configs
    },
    history(state, history) {
      state.history = history
    },
    historyAdd(state, run) {
      state.history.unshift(run)
    },
    favorites(state, list) {
      state.favorites = list
    },
    favoritesAdd(state, query) {
      state.favorites.unshift(query)
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
      let connection = server.db(newDatabase)
      if (! connection) {
        connection = server.createConnection(newDatabase)
        await connection.connect()
      }
      context.commit('updateConnection', {connection, database: newDatabase})
      await context.dispatch('updateTables')
    },
    async updateTables(context) {
      const tables = await context.state.connection.listTables()
      const result = await Promise.all(_.map(tables, async (table) => {
        table.columns = await context.state.connection.listTableColumns(table.name)
        return table
      }))
      context.commit('tables', result)
    },

    async pinTable(context, table) {
      table.pinned = true
      context.commit('addPinned', table)
    },
    async unpinTable(context, table) {
      table.pinned = false
      context.commit('removePinned', table)
    },
    async saveConnectionConfig(context, newConfig) {
      await newConfig.save()
      context.commit('config', newConfig)
    },
    async loadSavedConfigs(context) {
      let configs = await SavedConnection.find()
      context.commit('configs', configs)
    },
    async updateHistory(context) {
      let historyItems = await UsedQuery.find({ take: 100, order: { createdAt: 'DESC' } });
      context.commit('history', historyItems)
    },
    async logQuery(context, details) {
      const run = new UsedQuery()
      run.text = details.text
      run.database = context.state.database
      run.connectionHash = context.state.usedConfig.uniqueHash
      run.status = 'completed'
      run.numberOfRecords = details.rowCount
      await run.save()
      context.commit('historyAdd', run)
    },

    async updateFavorites(context) {
      const items = await FavoriteQuery.find({order: { createdAt: 'DESC'}})
      context.commit('favorites', items)
    },
    async saveFavorite(context, query) {
      query.database = context.state.database
      query.connectionHash = context.state.usedConfig.uniqueHash
      await query.save()
      // otherwise it's already there!
      if (!context.state.favorites.includes(query)) {
        context.commit('favoritesAdd', query)
      }
    }
  },
  plugins: [],
  devtools: config.environment == 'development'
})

export default store
