
import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import username from 'username'
// import VueXPersistence from 'vuex-persist'

import { UsedConnection } from '@/entity/used_connection'
import { SavedConnection } from '@/entity/saved_connection'
import { FavoriteQuery } from '@/entity/favorite_query'
import { UsedQuery } from '@/entity/used_query'
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
    tablesLoading: "loading tables...",
    pinStore: {},
    connectionConfigs: [],
    history: [],
    favorites: [],
    username: null
  },
  getters: {
    pinned(state) {
      const result = state.pinStore[state.database]
      return _.isNil(result) ? [] : result
    },
    schemaTables(state){
      const obj = _.chain(state.tables).groupBy('schema').value()
      return _(obj).keys().map(k => {
        return {
          schema: k,
          tables: obj[k]
        }
      }).orderBy(o => {
        // TODO: have the connection provide the default schema, hard-coded to public by default
        if (o.schema === 'public') return '0'
        return o.schema
      }).value()
    },
    tablesHaveSchemas(state, getters) {
      return getters.schemaTables.length > 1
    },
    connectionColor(state) {
      return state.usedConfig ? state.usedConfig.labelColor : 'default'
    }
  },
  mutations: {
    setUsername(state, name) {
      state.username = name
    },
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
    tablesLoading(state, value) {
      state.tablesLoading = value
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
    removeConfig(state, config) {
      state.connectionConfigs = _.without(state.connectionConfigs, config)
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
      const server = ConnectionProvider.for(config, context.state.username)
      await server.createConnection(config.defaultDatabase).connect()
      server.disconnect()
    },

    async fetchUsername(context) {
      const name = await username()
      context.commit('setUsername', name)
    },

    async connect(context, config) {
      const server = ConnectionProvider.for(config, context.state.username)
      const connection = await server.createConnection(config.defaultDatabase)
      await connection.connect()
      connection.connectionType = config.connectionType;
      const usedConfig = new UsedConnection(config)
      await usedConfig.save()
      context.commit('newConnection', {config: config, server, connection})
    },
    async disconnect(context) {
      const server = context.state.server
      server.disconnect()
      context.commit('clearConnection')
      context.commit('tables', [])
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
      // Ideally here we would run all queries in parallel
      // however running through an SSH tunnel doesn't work
      // it only supports one query at a time.
      try {
        context.commit("tablesLoading", "finding tables")
        const onlyTables = await context.state.connection.listTables({ schema: null })
        onlyTables.forEach((t) => {
          t.entityType = 'table'
        })
        const views = await context.state.connection.listViews({ schema: null })
        views.forEach((v) => {
          v.entityType = 'view'
        })

        const materialized = await context.state.connection.listMaterializedViews({schema: null})
        materialized.forEach(v => v.entityType = 'materialized-view')
        const tables = onlyTables.concat(views).concat(materialized)
        var processed = 0

        await Promise.all(tables.map(table => {
          return new Promise(async (resolve, reject) => {
            try {
              let columns = []
              if (table.entityType === 'materialized-view') {
                columns = await context.state.connection.listMaterializedViewColumns(table.name, table.schema)
              } else {
                columns = await context.state.connection.listTableColumns(table.name, table.schema)
              }

              processed += 1
              context.commit("tablesLoading", `Loading ${processed}/${tables.length} tables`)
              table.columns = columns
              resolve()
            } catch (error) {
              reject(error)
            }
          })
        }))
        context.commit('tables', tables)

      } finally {
        context.commit("tablesLoading", null)
      }
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
    async removeConnectionConfig(context, config) {
      await config.remove()
      context.commit('removeConfig', config)
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
  plugins: []
})

export default store
