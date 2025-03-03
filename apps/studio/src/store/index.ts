import _ from 'lodash'
import Vue from 'vue'
import Vuex from 'vuex'

import ExportStoreModule from './modules/exports/ExportStoreModule'
import SettingStoreModule from './modules/settings/SettingStoreModule'
import { Routine, SupportedFeatures, TableOrView } from "../lib/db/models"
import { IDbConnectionPublicServer } from '../lib/db/serverTypes'
import { CoreTab, EntityFilter } from './models'
import { entityFilter } from '../lib/db/sql_tools'
import { BeekeeperPlugin } from '../plugins/BeekeeperPlugin'

import RawLog from '@bksLogger'
import { Dialect, DialectTitles, dialectFor } from '@shared/lib/dialects/models'
import { PinModule } from './modules/PinModule'
import { getDialectData } from '@shared/lib/dialects'
import { SearchModule } from './modules/SearchModule'
import { IWorkspace, LocalWorkspace } from '@/common/interfaces/IWorkspace'
import { IConnection } from '@/common/interfaces/IConnection'
import { DataModules } from '@/store/DataModules'
import { TabModule } from './modules/TabModule'
import { HideEntityModule } from './modules/HideEntityModule'
import { PinConnectionModule } from './modules/PinConnectionModule'
import { ElectronUtilityConnectionClient } from '@/lib/utility/ElectronUtilityConnectionClient'

import { SmartLocalStorage } from '@/common/LocalStorage'

import { LicenseModule } from './modules/LicenseModule'
import { CredentialsModule, WSWithClient } from './modules/CredentialsModule'
import { UserEnumsModule } from './modules/UserEnumsModule'
import MultiTableExportStoreModule from './modules/exports/MultiTableExportModule'
import ImportStoreModule from './modules/imports/ImportStoreModule'
import { BackupModule } from './modules/backup/BackupModule'
import globals from '@/common/globals'
import { CloudClient } from '@/lib/cloud/CloudClient'
import { ConnectionTypes } from '@/lib/db/types'


const log = RawLog.scope('store/index')

const tablesMatch = (t: TableOrView, t2: TableOrView) => {
  return t2.name === t.name &&
    t2.schema === t.schema &&
    t2.entityType === t.entityType
}


export interface State {
  connection: ElectronUtilityConnectionClient,
  usedConfig: Nullable<IConnection>,
  server: Nullable<IDbConnectionPublicServer>,
  connected: boolean,
  connectionType: Nullable<string>,
  supportedFeatures: Nullable<SupportedFeatures>,
  database: Nullable<string>,
  databaseList: string[],
  tables: TableOrView[],
  routines: Routine[],
  entityFilter: EntityFilter,
  columnsLoading: string,
  tablesLoading: string,
  tablesInitialLoaded: boolean,
  username: Nullable<string>,
  menuActive: boolean,
  activeTab: Nullable<CoreTab>,
  selectedSidebarItem: Nullable<string>,
  workspaceId: number,
  storeInitialized: boolean,
  windowTitle: string,
  defaultSchema: string,
  versionString: string,
  connError: string
  expandFKDetailsByDefault: boolean
  openDetailView: boolean
  tableTableSplitSizes: number[]
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
    licenses: LicenseModule,
    credentials: CredentialsModule,
    hideEntities: HideEntityModule,
    userEnums: UserEnumsModule,
    pinnedConnections: PinConnectionModule,
    multiTableExports: MultiTableExportStoreModule,
    imports: ImportStoreModule,
    backups: BackupModule
  },
  state: {
    connection: new ElectronUtilityConnectionClient(),
    usedConfig: null,
    server: null,
    connected: false,
    connectionType: null,
    supportedFeatures: null,
    database: null,
    databaseList: [],
    tables: [],
    routines: [],
    entityFilter: {
      filterQuery: undefined,
      showTables: true,
      showRoutines: true,
      showViews: true,
      showPartitions: false
    },
    tablesLoading: null,
    columnsLoading: null,
    tablesInitialLoaded: false,
    username: null,
    menuActive: false,
    activeTab: null,
    selectedSidebarItem: null,
    workspaceId: LocalWorkspace.id,
    storeInitialized: false,
    windowTitle: 'Beekeeper Studio',
    defaultSchema: null,
    versionString: null,
    connError: null,
    expandFKDetailsByDefault: SmartLocalStorage.getBool('expandFKDetailsByDefault'),
    openDetailView: SmartLocalStorage.getBool('openDetailView', true),
    tableTableSplitSizes: SmartLocalStorage.getJSON('tableTableSplitSizes', globals.defaultTableTableSplitSizes),
  },

  getters: {
    defaultSchema(state) {
      return state.defaultSchema;
    },
    friendlyConnectionType(state) {
      return ConnectionTypes.find((ct) => ct.value == state.connectionType)?.name ?? "Default Connection"
    },
    workspace(state, getters): IWorkspace {
      if (state.workspaceId === LocalWorkspace.id) return LocalWorkspace

      const workspaces: WSWithClient[] = getters['credentials/workspaces']
      const result = workspaces.find(({workspace }) => workspace.id === state.workspaceId)

      if (!result) return LocalWorkspace
      return result.workspace
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
    cloudClient(state: State, getters): CloudClient | null {
      if (state.workspaceId === LocalWorkspace.id) return null

      const workspaces: WSWithClient[] = getters['credentials/workspaces']
      const result = workspaces.find(({workspace}) => workspace.id === state.workspaceId)
      if (!result) return null
      return result.client.cloneWithWorkspace(result.workspace.id)

    },
    dialect(state: State): Dialect | null {
      if (!state.usedConfig) return null
      return dialectFor(state.usedConfig.connectionType)
    },
    dialectTitle(_state: State, getters): string {
      return DialectTitles[getters.dialect] || getters.dialect || 'Unknown'
    },
    dialectData(_state: State, getters) {
      return getDialectData(getters.dialect)
    },
    selectedSidebarItem(state) {
      return state.selectedSidebarItem
    },
    filteredTables(state) {
      return entityFilter(state.tables, state.entityFilter);
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

      for (const key in routines) {
        if (!obj[key]) {
            obj[key] = [];
        }
      }

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
    minimalMode(_state, getters) {
      return getters['settings/minimalMode']
    },
    // TODO (@day): this may need to be removed
    versionString(state) {
      return state.server.versionString();
    },
    isCommunity(_state, _getters, _rootState, rootGetters) {
      return rootGetters['licenses/isCommunity']
    },
    isUltimate(_state, _getters, _rootState, rootGetters) {
      return rootGetters['licenses/isUltimate']
    },
    isTrial(_state, _getters, _rootState, rootGetters) {
      return rootGetters['licenses/isTrial']
    },
    expandFKDetailsByDefault(state) {
      return state.expandFKDetailsByDefault
    },
    openDetailView(state) {
      return state.openDetailView
    },
  },
  mutations: {
    storeInitialized(state, b: boolean) {
      state.storeInitialized = b
    },
    workspaceId(state, id: number) {
      state.workspaceId = Number(id)
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
    showPartitions(state) {
      state.entityFilter.showPartitions = !state.entityFilter.showPartitions
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
    newConnection(state, config: Nullable<IConnection>) {
      state.usedConfig = config
      state.database = config?.defaultDatabase
    },
    // this shouldn't be used at all
    clearConnection(state) {
      state.usedConfig = null
      state.connected = false
      state.supportedFeatures = null
      state.server = null
      state.database = null
      state.databaseList = []
      state.tables = []
      state.routines = []
      state.entityFilter = {
        filterQuery: undefined,
        showTables: true,
        showViews: true,
        showRoutines: true,
        showPartitions: false
      }
    },
    updateConnection(state, {database}) {
      // state.connection = connection
      state.database = database
    },
    databaseList(state, dbs: string[]) {
      state.databaseList = dbs
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
          t.columns ||= []
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
        Vue.set(state.tables, existingIdx, table)
      } else {
        state.tables = [...state.tables, table]
      }
    },
    routines(state, routines) {
      state.routines = Object.freeze(routines)
    },
    columnsLoading(state, value: string) {
      state.columnsLoading = value
    },
    tablesLoading(state, value: string) {
      state.tablesLoading = value
    },
    updateWindowTitle(state, title: string) {
      state.windowTitle = title
    },
    defaultSchema(state, defaultSchema: string) {
      state.defaultSchema = defaultSchema;
    },
    connectionType(state, connectionType: string) {
      state.connectionType = connectionType;
    },
    connected(state, connected: boolean) {
      state.connected = connected;
    },
    supportedFeatures(state, features: SupportedFeatures) {
      state.supportedFeatures = features;
    },
    versionString(state, versionString: string) {
      state.versionString = versionString;
    },
    setConnError(state, err: string) {
      state.connError = err;
    },
    expandFKDetailsByDefault(state, value: boolean) {
      state.expandFKDetailsByDefault = value
    },
    openDetailView(state, value: boolean) {
      state.openDetailView = value
    },
    tableTableSplitSizes(state, value: number[]) {
      state.tableTableSplitSizes = value
    },
  },
  actions: {
    async test(context, config: IConnection) {
      await Vue.prototype.$util.send('conn/test', { config, osUser: context.state.username });
    },

    async fetchUsername(context) {
      const name = await window.main.fetchUsername();
      context.commit('setUsername', name)
    },

    async openUrl(context, url: string) {
      const conn = await Vue.prototype.$util.send('appdb/saved/parseUrl', { url });
      await context.dispatch('connect', conn)
    },

    updateWindowTitle(context) {
      const config = context.state.usedConfig
      let title = config
        ? `${BeekeeperPlugin.buildConnectionName(config)} - Beekeeper Studio`
        : 'Beekeeper Studio'
      if (context.getters.isTrial && context.getters.isUltimate) {
        const days = context.rootGetters['licenses/licenseDaysLeft']
        title += ` - Free Trial (${window.main.pluralize('day', days, true)} left)`
      }
      context.commit('updateWindowTitle', title)
      window.main.setWindowTitle(title);
    },

    async saveConnection(context, config: IConnection) {
      await context.dispatch('data/connections/save', config)
      const isConnected = !!context.state.server
      if(isConnected) context.dispatch('updateWindowTitle', config)
    },

    async connect(context, config: IConnection) {
      if (context.state.username) {
        await Vue.prototype.$util.send('conn/create', { config, osUser: context.state.username })
        const defaultSchema = await context.state.connection.defaultSchema();
        const supportedFeatures = await context.state.connection.supportedFeatures();
        const versionString = await context.state.connection.versionString();

        if (supportedFeatures.backups) {
          const serverConfig = await Vue.prototype.$util.send('conn/getServerConfig');
          context.dispatch('backups/setConnectionConfigs', { config, supportedFeatures, serverConfig });
        }

        context.commit('defaultSchema', defaultSchema);
        context.commit('connectionType', config.connectionType);
        context.commit('connected', true);
        context.commit('supportedFeatures', supportedFeatures);
        context.commit('versionString', versionString);
        context.commit('newConnection', config)

        await context.dispatch('updateDatabaseList')
        await context.dispatch('updateTables')
        await context.dispatch('updateRoutines')
        await context.dispatch('data/usedconnections/recordUsed', config)
        context.dispatch('updateWindowTitle', config)

      } else {
        throw "No username provided"
      }
    },
    async reconnect(context) {
      if (context.state.connection) {
        await context.state.connection.connect();
      }
    },
    async disconnect(context) {
      const server = context.state.server
      server?.disconnect()
      context.commit('clearConnection')
      context.commit('newConnection', null)
      context.dispatch('updateWindowTitle')
      context.dispatch('refreshConnections')
    },
    async syncDatabase(context) {
      await context.state.connection.syncDatabase();
    },
    async changeDatabase(context, newDatabase: string) {
      log.info("Pool changing database to", newDatabase)
      await Vue.prototype.$util.send('conn/changeDatabase', { newDatabase });
      context.commit('updateConnection', {database: newDatabase})
      await context.dispatch('updateTables')
      await context.dispatch('updateDatabaseList')
      await context.dispatch('updateRoutines')
    },

    async updateTableColumns(context, table: TableOrView) {
      log.debug('actions/updateTableColumns', table.name)
      try {
        // FIXME: We should record which table we are loading columns for
        //        so that we know where to show this loading message. Not just
        //        show it for all tables.
        context.commit("columnsLoading", "Loading columns...")
        const columns = (table.entityType === 'materialized-view' ?
            await context.state.connection.listMaterializedViewColumns(table.name, table.schema) :
            await context.state.connection.listTableColumns(table.name, table.schema));

        const updated = _.xorWith(table.columns, columns, _.isEqual)
        log.debug('Should I update table columns?', updated)
        if (updated?.length) {
          context.commit('table', { ...table, columns })
        }
      } finally {
        context.commit("columnsLoading", null)
      }
    },
    async updateDatabaseList(context) {
      const databaseList = await context.state.connection.listDatabases();
      context.commit('databaseList', databaseList)
    },
    async updateTables(context) {
      // FIXME: We should only load tables for the active/default schema
      //        then we should load new tables when a schema is expanded in the sidebar
      //        or for auto-complete in the editor.
      //        Currently: Loads all tables, regardless of schema
      try {
        const schema = null
        context.commit("tablesLoading", "Loading tables...")
        const onlyTables = await context.state.connection.listTables(schema);
        onlyTables.forEach((t) => {
          t.entityType = 'table'
        })
        const views = await context.state.connection.listViews(schema);
        views.forEach((v) => {
          v.entityType = 'view'
        })

        const materialized = await context.state.connection.listMaterializedViews(schema);
        materialized.forEach(v => v.entityType = 'materialized-view')
        const tables = onlyTables.concat(views).concat(materialized)

        // FIXME (matthew): We're doing another loop here for no reason
        // so we're looping n*2 times
        // Also this is a little duplicated from `updateTableColumns`, but it doesn't make sense
        // to dispatch that separately as it causes blinking tabletable state.
        for (const table of tables) {
          const match = context.state.tables.find((st) => tablesMatch(st, table))
          if (match?.columns?.length > 0) {
            table.columns = (table.entityType === 'materialized-view' ?
              await context.state.connection?.listMaterializedViewColumns(table.name, table.schema) :
              await context.state.connection?.listTableColumns(table.name, table.schema)) || []
          }
        }
        context.commit("tablesLoading", `Loading ${tables.length} tables`)

        context.commit('tables', tables)
      } finally {
        context.commit("tablesLoading", null)
      }
    },
    async updateRoutines(context) {
      const routines: Routine[] = await context.state.connection.listRoutines(null);
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
    async menuActive(context, value) {
      context.commit('menuActive', value)
    },
    async tabActive(context, value: CoreTab) {
      context.commit('tabActive', value)
    },
    async refreshConnections(context) {
      context.dispatch('data/connectionFolders/load')
      context.dispatch('data/connections/load')
      await context.dispatch('pinnedConnections/loadPins');
      await context.dispatch('pinnedConnections/reorder');
    },
    async initRootStates(context) {
      await context.dispatch('fetchUsername')
      await context.dispatch('licenses/init')
      await context.dispatch('userEnums/init')
      await context.dispatch('updateWindowTitle')
      setInterval(
        () => context.dispatch('licenses/sync'),
        globals.licenseCheckInterval
      )
    },
    licenseEntered(context) {
      context.dispatch('updateWindowTitle')
    },
    toggleFlag(context, { flag, value }: { flag: string, value?: boolean }) {
      if (typeof value === 'undefined') {
        value = !context.state[flag]
      }
      SmartLocalStorage.setBool(flag, value)
      context.commit(flag, value)
      return value
    },
    toggleOpenDetailView(context, value?: boolean) {
      if (typeof value === 'undefined') {
        value = !context.state.openDetailView
      }
      SmartLocalStorage.setBool('openDetailView', value)
      context.commit('openDetailView', value)
      return value
    },
    setTableTableSplitSizes(context, value: number[]) {
      SmartLocalStorage.addItem('tableTableSplitSizes', value)
      context.commit('tableTableSplitSizes', value)
    },
    toggleExpandFKDetailsByDefault(context, value?: boolean) {
      context.dispatch('toggleFlag', { flag: 'expandFKDetailsByDefault', value })
    },
  },
  plugins: []
})

export default store
