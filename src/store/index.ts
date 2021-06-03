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
import ExportStoreModule from './modules/exports/ExportStoreModule'
import SettingStoreModule from './modules/settings/SettingStoreModule'
import { DBConnection } from '../lib/db/client'
import { ExtendedTableColumn, Routine, TableColumn, TableOrView } from "../lib/db/models"
import { IDbConnectionPublicServer } from '../lib/db/server'
import { CoreTab, EntityFilter } from './models'
import { entityFilter } from '../lib/db/sql_tools'

import RawLog from 'electron-log'

const log = RawLog.scope('store/index')

interface State {
  usedConfig: Nullable<SavedConnection>,
  usedConfigs: UsedConnection[],
  server: Nullable<IDbConnectionPublicServer>,
  connection: Nullable<DBConnection>,
  database: Nullable<string>,
  tables: TableOrView[],
  routines: Routine[],
  entityFilter: EntityFilter,
  tablesLoading: string,
  pinStore: {
    [x: string]: string[]
  },
  connectionConfigs: UsedConnection[],
  history: UsedQuery[],
  favorites: UsedQuery[],
  username: Nullable<string>,
  menuActive: boolean,
  activeTab: Nullable<CoreTab>,
  selectedSidebarItem: Nullable<string>,
}

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store<State>({
  modules: {
    exports: ExportStoreModule,
    settings: SettingStoreModule
  },
  state: {
    usedConfig: null,
    usedConfigs: [],
    server: null,
    connection: null,
    database: null,
    tables: [],
    routines: [],
    entityFilter: {
      filterQuery: undefined,
      showTables: true,
      showRoutines: true,
      showViews: true
    },
    tablesLoading: "loading tables...",
    pinStore: {},
    connectionConfigs: [],
    history: [],
    favorites: [],
    username: null,
    menuActive: false,
    activeTab: null,
    selectedSidebarItem: null
  },
  getters: {
    selectedSidebarItem(state) {
      return state.selectedSidebarItem
    },
    orderedUsedConfigs(state) {
      return _.sortBy(state.usedConfigs, 'updatedAt').reverse()
    },
    pinned(state) {
      const result = state.database ? state.pinStore[state.database] : null
      return _.isNil(result) ? [] : result
    },
    filteredTables(state) {
      return entityFilter(state.tables, state.entityFilter)
    },
    filteredRoutines(state) {
      return entityFilter(state.routines, state.entityFilter)
    },
    schemaTables(state, g){
      // if no schemas, just return a single schema
      if (_.chain(state.tables).map('schema').uniq().value().length <= 1) {
        return [{
          schema: null,
          skipSchemaDisplay: true,
          tables: g.filteredTables,
          routines: g.filteredRoutines
        }]
      }
      const obj = _.chain(g.filteredTables).groupBy('schema').value()
      const routines = _.groupBy(g.filteredRoutines, 'schema')
      return _(obj).keys().map(k => {
        return {
          schema: k,
          tables: obj[k],
          routines: routines[k] || []
        }
      }).orderBy(o => {
        // TODO: have the connection provide the default schema, hard-coded to public by default
        if (o.schema === 'public') return '0'
        return o.schema
      }).value()
    },
    tablesHaveSchemas(_state, getters) {
      return getters.schemaTables.length > 1
    },
    connectionColor(state) {
      return state.usedConfig ? state.usedConfig.labelColor : 'default'
    }
  },
  mutations: {
    selectSidebarItem(state, item: string) {
      state.selectedSidebarItem = item
    },
    entityFilter(state, filter) {
      state.entityFilter = filter
    },
    filterQuery(state, str: string) {
      state.entityFilter.filterQuery = str
    },
    showTables(state) {
      state.entityFilter.showTables = !state.entityFilter.showTables
    },
    showViews(state) {
      state.entityFilter.showViews = !state.entityFilter.showViews
    },
    showRoutines(state) {
      state.entityFilter.showRoutines = !state.entityFilter.showRoutines
    },
    tabActive(state, tab: CoreTab) {
      state.activeTab = tab
    },
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
      state.server = null
      state.database = null
      state.tables = []
      state.routines = []
      state.entityFilter = {
        filterQuery: undefined,
        showTables: true,
        showViews: true,
        showRoutines: true
      }
    },
    updateConnection(state, {connection, database}) {
      state.connection = connection
      state.database = database
    },
    tables(state, tables: TableOrView[]) {
      const tablesMatch = (t: TableOrView, t2: TableOrView) => {
        return t2.name === t.name &&
        t2.schema === t.schema &&
        t2.entityType === t.entityType
      }

      if(state.tables.length === 0) {
        state.tables = tables
        return
      }
      
      // TODO: make this not O(n^2)
      const result = tables.map((t) => {
        const existingIdx = state.tables.findIndex((st) => tablesMatch(st, t))
        if ( existingIdx >= 0) {
          const existing = state.tables[existingIdx]
          Object.assign(existing, t)
          return existing
        } else {
          return t
        }
      })
      state.tables = result
    },

    routines(state, routines) {
      state.routines = Object.freeze(routines)
    },
    tablesLoading(state, value: string) {
      state.tablesLoading = value
    },
    addPinned(state, table: any) {
      if (state.database && !state.pinStore[state.database]) {
        Vue.set(state.pinStore, state.database, [table])
      } else if (state.database && !state.pinStore[state.database].includes(table)) {
        state.pinStore[state.database].push(table)
      }
    },
    setPinned(state, pins) {
      if (state.database) {
        Vue.set(state.pinStore, state.database, pins)
      }
    },
    removePinned(state, table) {
      if (!state.database || !state.pinStore[state.database]) {
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
      if (context.state.username) {
        const server = ConnectionProvider.for(config, context.state.username)
        await server?.createConnection(config.defaultDatabase || undefined).connect()
        server.disconnect()
      } else {
        throw "No username provided"
      }
    },

    async fetchUsername(context) {
      const name = await username()
      context.commit('setUsername', name)
    },

    async openUrl(context, url: string) {
      console.log("open url", url)
      const conn = new SavedConnection();
      if (!conn.parse(url)) {
        throw `Unable to parse ${url}`
      } else {
        await context.dispatch('connect', conn)
      }
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
      } else {
        throw "No username provided"
      }
    },
    async disconnect(context) {
      const server = context.state.server
      server?.disconnect()
      context.commit('clearConnection')
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
        await context.dispatch('updateRoutines') 
      }
    },

    async updateTableColumns(context, table: TableOrView) {
      log.debug('actions/updateTableColumns', table.name)
      // we don't need to commit to the store, it should already be in the store.
      const connection = context.state.connection
      const columns = (table.entityType === 'materialized-view' ?
        await connection?.listMaterializedViewColumns(table.name, table.schema) :
        await connection?.listTableColumns(table.name, table.schema)) || []

      const newcols = columns.map((c) => {
        `${c.columnName}${c.dataType}`
      }).sort()

      const existing = !table.columns ? [] : table.columns.map((c) => {
        `${c.columnName}${c.dataType}`
      }).sort()
      
      if(_.isEqual(newcols, existing)) {
        return
      }
      table.columns = columns
    },

    async updateTables(context) {
      // Ideally here we would run all queries in parallel
      // however running through an SSH tunnel doesn't work
      // it only supports one query at a time.

      const schema = null

      if (context.state.connection) {
        try {
          context.commit("tablesLoading", "Finding tables")
          const onlyTables = await context.state.connection.listTables({ schema })
          onlyTables.forEach((t) => {
            t.entityType = 'table'
          })
          const views = await context.state.connection.listViews({ schema })
          views.forEach((v) => {
            v.entityType = 'view'
          })

          const materialized = await context.state.connection.listMaterializedViews({ schema })
          materialized.forEach(v => v.entityType = 'materialized-view')
          const tables = onlyTables.concat(views).concat(materialized)
          context.commit("tablesLoading", `Loading ${tables.length} tables`)

          const tableColumns = await context.state.connection.listTableColumns()
          let viewColumns: TableColumn[] = []
          for (let index = 0; index < materialized.length; index++) {
            const view = materialized[index]
            const columns = await context.state.connection.listMaterializedViewColumns(view.name, view.schema)
            viewColumns = viewColumns.concat(columns)
          }

          type MaybeColumn = ExtendedTableColumn | TableColumn
          const allColumns: MaybeColumn[]  = [...tableColumns, ...viewColumns]
          log.info("ALL COLUMNS", allColumns)
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
    async updateRoutines(context) {
      if (!context.state.connection) return;
      const connection = context.state.connection
      const routines = await connection.listRoutines({ schema: null })
      context.commit('routines', routines)
    },
    async setFilterQuery(context, filterQuery) {
      context.commit('filterQuery', filterQuery)
    },
    async pinTable(context, table) {
      table.pinned = true
      context.commit('addPinned', table)
    },
    async unpinTable(context, table) {
      table.pinned = false
      context.commit('removePinned', table)
    },
    async pinRoutine(context, routine: Routine) {
      routine.pinned = true
      context.commit('addPinned', routine)
    },
    async unpinRoutine(context, routine: Routine) {
      routine.pinned = true
      context.commit('addPinned', routine)
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
      query.database = context.state.database || 'default'
      await query.save()
      // otherwise it's already there!
      if (!context.state.favorites.includes(query)) {
        context.commit('favoritesAdd', query)
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
    },
    async tabActive(context, value: CoreTab) {
      context.commit('tabActive', value)
    } 
  },
  plugins: []
})

export default store
