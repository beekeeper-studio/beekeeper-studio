import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import username from 'username'
// import VueXPersistence from 'vuex-persist'

import { UsedConnection } from '../common/appdb/models/used_connection'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import { FavoriteQuery } from '../common/appdb/models/favorite_query'
import { UsedQuery } from '../common/appdb/models/used_query'
import ConnectionProvider from '../lib/connection-provider'
import SettingStoreModule from './modules/settings/SettingStoreModule'
import { DBConnection, IDbColumn } from '../lib/db/client'
import { IDbConnectionPublicServer } from '../lib/db/server'

interface IDbEntityWithColumns {
  columns: IDbColumn[]
}

interface State {
  usedConfig: Nullable<SavedConnection>,
  usedConfigs: UsedConnection[],
  server: Nullable<IDbConnectionPublicServer>,
  connection: Nullable<DBConnection>,
  database: Nullable<string>,
  tables: IDbEntityWithColumns[],
  tablesLoading: string,
  pinStore: {
    [x: string]: string[]
  },
  connectionConfigs: UsedConnection[],
  history: UsedQuery[],
  favorites: UsedQuery[],
  username: Nullable<string>,
  menuActive: boolean
}

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store<State>({
  modules: {
    settings: SettingStoreModule
  },
  state: {
    usedConfig: null,
    usedConfigs: [],
    server: null,
    connection: null,
    database: null,
    tables: [],
    tablesLoading: "loading tables...",
    pinStore: {},
    connectionConfigs: [],
    history: [],
    favorites: [],
    username: null,
    menuActive: false
  },
  getters: {
    orderedUsedConfigs(state) {
      return _.sortBy(state.usedConfigs, 'updatedAt').reverse()
    },
    pinned(state) {
      const result = state.database ? state.pinStore[state.database] : null
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
    menuActive(state, value) {
      state.menuActive = !!value
    },
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
    tablesLoading(state, value: string) {
      state.tablesLoading = value
    },
    addPinned(state, table: string) {
      if (state.database && state.pinStore[state.database] === null) {
        Vue.set(state.pinStore, state.database, [])
      }
      if (state.database && !state.pinStore[state.database].includes(table)) {
        state.pinStore[state.database].push(table)
      }
    },
    removePinned(state, table) {
      if (state.database === null || state.pinStore[state.database] === null) {
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
    removeUsedConfig(state, config) {
      state.usedConfigs = _.without(state.usedConfigs, config)
    },
    configs(state, configs: UsedConnection[]){
      Vue.set(state, 'connectionConfigs', configs)
    },
    usedConfigs(state, configs: UsedConnection[]) {
      Vue.set(state, 'usedConfigs', configs)
    },
    history(state: State, history) {
      state.history = history
    },
    historyAdd(state: State, run: UsedQuery) {
      state.history.unshift(run)
    },
    historyRemove(state, historyQuery) {
      state.history = _.without(state.history, historyQuery)
    },
    favorites(state: State, list) {
      state.favorites = list
    },
    favoritesAdd(state: State, query) {
      state.favorites.unshift(query)
    },
    removeUsedFavorite(state: State, favorite) {
      state.favorites = _.without(state.favorites, favorite)
    },

  },
  actions: {

    async test(context, config: SavedConnection) {
      // TODO (matthew): fix this mess.
      if (context.state.username && config.defaultDatabase) {
        const server = ConnectionProvider.for(config, context.state.username)
        await server?.createConnection(config.defaultDatabase).connect()
        server.disconnect()
      }
    },

    async fetchUsername(context) {
      const name = await username()
      context.commit('setUsername', name)
    },

    async connect(context, config: SavedConnection) {
      if (context.state.username) {
        const server = ConnectionProvider.for(config, context.state.username)
        // TODO: (geovannimp) Check case connection is been created with undefined as key
        const connection = server.createConnection(config.defaultDatabase || undefined)
        await connection.connect()
        connection.connectionType = config.connectionType;
        const lastUsedConnection = context.state.usedConfigs.find(c => c.hash === config.hash)
        if (!lastUsedConnection) {
          const usedConfig = new UsedConnection(config)
          await usedConfig.save()
        } else {
          lastUsedConnection.updatedAt = new Date()
          if (config.id) {
            lastUsedConnection.savedConnectionId = config.id
          }
          await lastUsedConnection.save()
        }
        context.commit('newConnection', {config: config, server, connection})
      }
    },
    async disconnect(context) {
      const server = context.state.server
      server?.disconnect()
      context.commit('clearConnection')
      context.commit('tables', [])
    },
    async changeDatabase(context, newDatabase: string) {
      if (context.state.server) {
        const server = context.state.server
        let connection = server.db(newDatabase)
        if (! connection) {
          connection = server.createConnection(newDatabase)
          await connection.connect()
        }
        context.commit('updateConnection', {connection, database: newDatabase})
        await context.dispatch('updateTables')
      }
    },
    async updateTables(context) {
      // Ideally here we would run all queries in parallel
      // however running through an SSH tunnel doesn't work
      // it only supports one query at a time.

      if (context.state.connection) {
        try {
          context.commit("tablesLoading", "Finding tables")
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
          context.commit("tablesLoading", `Loading ${tables.length} tables`)

          const tableColumns = await context.state.connection.listTableColumns()
          let viewColumns: IDbColumn[] = []
          for (let index = 0; index < materialized.length; index++) {
            const view = materialized[index]
            const columns = await context.state.connection.listMaterializedViewColumns(view.name, view.schema)
            viewColumns = viewColumns.concat(columns)
          }

          const allColumns = tableColumns.concat(viewColumns)

          tables.forEach((table) => {
            table.columns = allColumns.filter(row => {
              return row.tableName === table.name && (!table.schema || table.schema === row.schemaName)
            })
          })

          context.commit('tables', tables)

        } finally {
          context.commit("tablesLoading", null)
        }
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
    async removeUsedConfig(context, config) {
      await config.remove()
      context.commit('removeUsedConfig', config)
    },
    async loadSavedConfigs(context) {
      const configs = await SavedConnection.find()
      context.commit('configs', configs)
    },
    async loadUsedConfigs(context) {
      const configs = await UsedConnection.find({take: 10, order: {createdAt: 'DESC'}})
      context.commit('usedConfigs', configs)
    },
    async updateHistory(context) {
      const historyItems = await UsedQuery.find({ take: 100, order: { createdAt: 'DESC' } });
      context.commit('history', historyItems)
    },
    async logQuery(context, details) {
      if (context.state.database) {
        const run = new UsedQuery()
        run.text = details.text
        run.database = context.state.database
        run.status = 'completed'
        run.numberOfRecords = details.rowCount
        await run.save()
        context.commit('historyAdd', run)
      }
    },
    async updateFavorites(context) {
      const items = await FavoriteQuery.find({order: { createdAt: 'DESC'}})
      context.commit('favorites', items)
    },
    async saveFavorite(context, query: UsedQuery) {
      if (context.state.database) {
        query.database = context.state.database
        await query.save()
        // otherwise it's already there!
        if (!context.state.favorites.includes(query)) {
          context.commit('favoritesAdd', query)
        }
      }
    },
    async removeFavorite(context, favorite) {
      await favorite.remove()
      context.commit('removeUsedFavorite', favorite)
    },
    async removeHistoryQuery(context, historyQuery) {
      await historyQuery.remove()
      context.commit('historyRemove', historyQuery)
    },
    async menuActive(context, value) {
      context.commit('menuActive', value)
    }
  },
  plugins: []
})

export default store
