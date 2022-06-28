import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'
import username from 'username'

import { UsedConnection } from '../common/appdb/models/used_connection'
import { SavedConnection } from '../common/appdb/models/saved_connection'
import ConnectionProvider from '../lib/connection-provider'
import ExportStoreModule from './modules/exports/ExportStoreModule'
import SettingStoreModule from './modules/settings/SettingStoreModule'
import { DBConnection } from '../lib/db/client'
import { ExtendedTableColumn, Routine, TableColumn, TableOrView } from "../lib/db/models"
import { IDbConnectionPublicServer } from '../lib/db/server'
import { CoreTab, EntityFilter } from './models'
import { entityFilter } from '../lib/db/sql_tools'

import RawLog from 'electron-log'
import { Dialect, dialectFor } from '@shared/lib/dialects/models'
import { PinModule } from './modules/PinModule'
import { getDialectData } from '@shared/lib/dialects'
import { SearchModule } from './modules/SearchModule'
import { IWorkspace, LocalWorkspace } from '@/common/interfaces/IWorkspace'
import { IConnection } from '@/common/interfaces/IConnection'
import { DataModules } from '@/store/DataModules'
import { TabModule } from './modules/TabModule'

const log = RawLog.scope('store/index')

const tablesMatch = (t: TableOrView, t2: TableOrView) => {
  return t2.name === t.name &&
    t2.schema === t.schema &&
    t2.entityType === t.entityType
}


export interface State {
  usedConfig: Nullable<IConnection>,
  usedConfigs: UsedConnection[],
  server: Nullable<IDbConnectionPublicServer>,
  connection: Nullable<DBConnection>,
  database: Nullable<string>,
  tables: TableOrView[],
  routines: Routine[],
  entityFilter: EntityFilter,
  tablesLoading: string,
  tablesInitialLoaded: boolean,
  connectionConfigs: UsedConnection[],
  username: Nullable<string>,
  menuActive: boolean,
  activeTab: Nullable<CoreTab>,
  selectedSidebarItem: Nullable<string>,
  workspaceId: number,
  storeInitialized: boolean
}

Vue.use(Vuex)
// const vuexFile = new VueXPersistence()

const store = new Vuex.Store<State>({
  modules: {
    exports: ExportStoreModule,
    settings: SettingStoreModule,
    pins: PinModule,
    tabs: TabModule,
    search: SearchModule,
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
    tablesInitialLoaded: false,
    connectionConfigs: [],
    username: null,
    menuActive: false,
    activeTab: null,
    selectedSidebarItem: null,
    workspaceId: LocalWorkspace.id,
    storeInitialized: false,
  },

  getters: {
    workspace(): IWorkspace {
      return LocalWorkspace
    },
    isCloud(state: State) {
      return state.workspaceId !== LocalWorkspace.id
    },
    workspaceEmail(_state: State, getters): string | null {
      return getters.cloudClient?.options?.email || null
    },
    pollError(state) {
      return DataModules.map((module) => {
        const pollError = state[module.path]['pollError']
        return pollError || null
      }).find((e) => !!e)
    },
    dialect(state: State): Dialect | null {
      if (!state.usedConfig) return null
      return dialectFor(state.usedConfig.connectionType)
    },
    dialectData(_state: State, getters) {
      return getDialectData(getters.dialect)
    },
    selectedSidebarItem(state) {
      return state.selectedSidebarItem
    },
    orderedUsedConfigs(state) {
      return _.sortBy(state.usedConfigs, 'updatedAt').reverse()
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
          schema: g.schemas[0] || null,
          skipSchemaDisplay: g.schemas.length < 2,
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
      return getters.schemas.length > 1
    },
    connectionColor(state) {
      return state.usedConfig ? state.usedConfig.labelColor : 'default'
    },
    schemas(state) {
      if (state.tables.find((t) => !!t.schema)) {
        return _.uniq(state.tables.map((t) => t.schema));
      }
      return []
    },

  },
  mutations: {
    storeInitialized(state, b: boolean) {
      state.storeInitialized = b
    },
    workspaceId(state, id: number) {
      state.workspaceId = id
    },
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
    unloadTables(state) {
      state.tables = []
      state.tablesInitialLoaded = false
    },
    tables(state, tables: TableOrView[]) {

      if(state.tables.length === 0) {
        state.tables = tables
      } else {
        // TODO: make this not O(n^2)
        const result = tables.map((t) => {
          const existingIdx = state.tables.findIndex((st) => tablesMatch(st, t))
          if (existingIdx >= 0) {
            const existing = state.tables[existingIdx]
            Object.assign(existing, t)
            return existing
          } else {
            return t
          }
        })
        state.tables = result
      }

      if (!state.tablesInitialLoaded) state.tablesInitialLoaded = true

    },

    table(state, table: TableOrView) {
      const existingIdx = state.tables.findIndex((st) => tablesMatch(st, table))
      if (existingIdx >= 0) {
        const result = state.tables
        Object.assign(result[existingIdx], table)
        state.tables = result
      } else {
        state.tables = [...state.tables, table]
      }
    },

    routines(state, routines) {
      state.routines = Object.freeze(routines)
    },
    tablesLoading(state, value: string) {
      state.tablesLoading = value
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
      const conn = new SavedConnection();
      if (!conn.parse(url)) {
        throw `Unable to parse ${url}`
      } else {
        await context.dispatch('connect', conn)
      }
    },

    async connect(context, config: IConnection) {
      if (context.state.username) {
        const server = ConnectionProvider.for(config, context.state.username)
        // TODO: (geovannimp) Check case connection is been created with undefined as key
        const connection = server.createConnection(config.defaultDatabase || undefined)
        await connection.connect()
        connection.connectionType = config.connectionType;

        context.commit('newConnection', {config: config, server, connection})
        context.dispatch('recordUsedConfig', config)
      } else {
        throw "No username provided"
      }
    },
    async recordUsedConfig(context, config: IConnection) {

      log.info("finding last used connection", config)
      const lastUsedConnection = context.state.usedConfigs.find(c => {
        return config.id &&
          config.workspaceId &&
          c.connectionId === config.id &&
          c.workspaceId === config.workspaceId
      })
      console.log("Found used config", lastUsedConnection)
      if (!lastUsedConnection) {
        const usedConfig = new UsedConnection(config)
        log.info("logging used connection", usedConfig, config)
        await usedConfig.save()
        context.commit('usedConfigs', [...context.state.usedConfigs, usedConfig])
      } else {
        lastUsedConnection.connectionId = config.id
        lastUsedConnection.workspaceId = config.workspaceId
        await lastUsedConnection.save()
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
      const connection = context.state.connection
      const columns = (table.entityType === 'materialized-view' ?
        await connection?.listMaterializedViewColumns(table.name, table.schema) :
        await connection?.listTableColumns(table.name, table.schema)) || []

      // TODO (don't update columns if nothing has changed (use duck typing))
      const updated = _.xorWith(table.columns, columns, _.isEqual)
      log.debug('Should I update table columns?', updated)
      if (updated) {
        table.columns = columns
        context.commit('table', table)
      }
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
      const routines: Routine[] = await connection.listRoutines({ schema: null })
      routines.forEach((r) => r.entityType = 'routine')
      context.commit('routines', routines)
    },
    setFilterQuery: _.debounce(function (context, filterQuery) {
      context.commit('filterQuery', filterQuery)
    }, 500),
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
    async removeUsedConfig(context, config) {
      await config.remove()
      context.commit('removeUsedConfig', config)
    },
    async loadUsedConfigs(context) {
      const configs = await UsedConnection.find(
        {
          take: 10,
          order: {createdAt: 'DESC'},
          where: { workspaceId: context.state.workspaceId}
        }
      )
      context.commit('usedConfigs', configs)
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
