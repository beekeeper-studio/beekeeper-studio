<template>
  <div  class="core-tabs" v-hotkey="keymap">
    <div class="tabs-header">
      <!-- <div class="nav-tabs nav"> -->
      <Draggable :options="dragOptions" v-model="tabItems" tag="ul" class="nav-tabs nav" chosen-class="nav-item-wrap-chosen">
        <core-tab-header
          v-for="tab in tabItems"
          :key="tab.id"
          :tab="tab"
          :tabsCount="tabItems.length"
          :selected="activeTab === tab"
          @click="click"
          @close="close"
          @closeAll="closeAll"
          @closeOther="closeOther"
          @duplicate="duplicate"
          ></core-tab-header>
      </Draggable>
      <!-- </div> -->
      <span class="actions">
        <a @click.prevent="createQuery(null)" class="btn-fab add-query"><i class=" material-icons">add_circle</i></a>
      </span>
    </div>
    <div class="tab-content">
      <div class="empty flex-col  expand">
        <div class="expand layout-center"><shortcut-hints></shortcut-hints></div>
        <statusbar class="tabulator-footer"></statusbar>
      </div>
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="tab.id"
        :class="{active: (activeTab === tab)}"
        v-show="activeTab === tab"
      >
        <QueryEditor v-if="tab.type === 'query'" :active="activeTab === tab" :tab="tab" :tabId="tab.id" :connection="connection"></QueryEditor>
        <TableTable @setTabTitleScope="setTabTitleScope" v-if="tab.type === 'table'" :active="activeTab === tab" :tabId="tab.id" :connection="tab.connection" :initialFilter="tab.initialFilter" :table="tab.table"></TableTable>
        <TableProperties v-if="tab.type === 'table-properties'" :active="activeTab === tab" :tabId="tab.id" :connection="tab.connection" :table="tab.table"></TableProperties>
        
      </div>
    </div>
    <!-- TODO - this should really be in TableTable -->


    <!-- TODO - all notifications should really be handled with an organized system -->

  </div>
</template>

<script>

  import _ from 'lodash'
  import sqlFormatter from 'sql-formatter';
  import {FavoriteQuery} from '../common/appdb/models/favorite_query'
  import QueryEditor from './TabQueryEditor'
  import Statusbar from './common/StatusBar'
  import CoreTabHeader from './CoreTabHeader'
  import { uuidv4 } from '@/lib/uuid'
  import TableTable from './tableview/TableTable'
  import TableProperties from './TabTableProperties'
  import {AppEvent} from '../common/AppEvent'
  import platformInfo from '../common/platform_info'
  import { mapGetters, mapState } from 'vuex'
  import Draggable from 'vuedraggable'
  import ShortcutHints from './editor/ShortcutHints.vue'

  export default {
    props: [ 'connection' ],
    components: { Statusbar, QueryEditor, CoreTabHeader, TableTable, TableProperties, Draggable, ShortcutHints },
    data() {
      return {
        tabItems: [],
        activeItem: 0,
        newTabId: 1,
        showExportModal: false,
        tableExportOptions: null,
        dragOptions: {
          handle: '.nav-item'
        },
        rootBindings: [
          { event: AppEvent.closeTab, handler: this.closeTab },
          { event: AppEvent.newTab, handler: this.createQuery},
          { event: 'historyClick', handler: this.createQueryFromItem},
          { event: 'loadTable', handler: this.openTable },
          { event: 'loadTableProperties', handler: this.openTableProperties},
          { event: 'loadSettings', handler: this.openSettings },
          { event: 'loadTableCreate', handler: this.loadTableCreate },
          { event: 'loadRoutineCreate', handler: this.loadRoutineCreate },
          { event: 'favoriteClick', handler: this.favoriteClick },
          { event: 'exportTable', handler: this.openExportModal },
        ]
      }
    },
    watch: {

    },
    computed: {
      ...mapState(["activeTab"]),
      ...mapGetters({ 'menuStyle': 'settings/menuStyle' }),
      lastTab() {
        return this.tabItems[this.tabItems.length - 1];
      },
      firstTab() {
        return this.tabItems[0]
      },
      activeIdx() {
        return _.indexOf(this.tabItems, this.activeTab)
      },
      keymap() {
        const meta = platformInfo.isMac ? 'meta' : 'ctrl'
        const closeTab = `${meta}+w`
        const result = {
          'ctrl+tab': this.nextTab,
          'ctrl+shift+tab': this.previousTab,
        }

        // This is a hack because codemirror steals the shortcut
        // when the shortcut is captured on the electron side
        // but not on mac, on mac we don't wanna capture it. Because reasons.
        // 'registerAccelerator' doesn't disable shortcuts on mac.
        if (!platformInfo.isMac) {
          result[closeTab] = this.closeTab
        }
        return result
      }
    },
    methods: {
      async setActiveTab(tab) {
        await this.$store.dispatch('tabActive', tab)
      },
      addTab(item) {
        this.tabItems.push(item)
        this.newTabId += 1
        this.$nextTick(() => {
          this.click(item)
        })
      },
      nextTab() {
        if(this.activeTab == this.lastTab) {
          this.setActiveTab(this.firstTab)
        } else {
          this.setActiveTab(this.tabItems[this.activeIdx + 1])
        }
      },

      previousTab() {
        if(this.activeTab == this.firstTab) {
          this.setActiveTab(this.lastTab)
        } else {
          this.setActiveTab(this.tabItems[this.activeIdx - 1])
        }
      },
      setTabTitleScope(id, value) {
        this.tabItems.filter(t => t.id === id).forEach(t => t.titleScope = value)
      },
      closeTab() {
        console.log('close tab', this.activeTab)
        this.close(this.activeTab)
      },
      handleCreateTab() {
        this.createQuery()
      },
      createQuery(optionalText) {
        // const text = optionalText ? optionalText : ""
        const query = new FavoriteQuery()
        query.text = optionalText

        const result = {
          id: uuidv4(),
          type: "query",
          title: "Query #" + this.newTabId,
          connection: this.connection,
          query: query,
          unsavedChanges: true
        }

        this.addTab(result)
      },
      async loadTableCreate(table) {
        let method = null
        if (table.entityType === 'table') method = this.connection.getTableCreateScript
        if (table.entityType === 'view') method = this.connection.getViewCreateScript
        if (!method) {
          this.$noty.error(`Can't find script for ${table.name} (${table.entityType})`)
          return
        }
        const result = await method(table.name, table.schema)
        const stringResult = sqlFormatter.format(_.isArray(result) ? result[0] : result)
        this.createQuery(stringResult)
      },
      async loadRoutineCreate(routine) {
        const result = await this.connection.getRoutineCreateScript(routine.name, routine.schema)
        const stringResult = sqlFormatter.format(_.isArray(result) ? result[0] : result)
        this.createQuery(stringResult)
      },
      openTableProperties({ table }) {
        const existing = this.tabItems.find((t) => {
          return t.type === 'table-properties' &&
            t.table === table
        })

        if (existing) return this.click(existing)

        const t = {
          id: uuidv4(),
          type: 'table-properties',
          table: table,
          connection: this.connection,
          title: `${table.name}`
        }
        this.addTab(t)
      },
      openTable({ table, filter, tableName }) {

        let resolvedTable = null

        if (!table && tableName) {
          resolvedTable = this.$store.state.tables.find(t => t.name === tableName)
        }
        const t = {
          id: uuidv4(),
          type: 'table',
          table: resolvedTable || table,
          connection: this.connection,
          initialFilter: filter,
          titleScope: "all"
        }
        this.addTab(t)
      },
      openExportModal(options) {
        this.tableExportOptions = options
        this.showExportModal = true
      },
      openSettings(settings) {
        const t = {
          title: "Settings",
          settings,
          type: 'settings'
        }
        this.addTab(t)
      },
      async click(tab) {
        await this.setActiveTab(tab)

      },
      close(tab) {
        console.log('closing tab', tab.title)
        if (this.activeTab === tab) {
          if(tab === this.lastTab) {
            this.previousTab()
          } else {
            this.nextTab()
          }
        }

        this.tabItems = _.without(this.tabItems, tab)
        if (tab.query && tab.query.id) {
          tab.query.reload()
        }
      },
      closeAll() {
        this.tabItems = []
        this.setActiveTab(null)
      },
      closeOther(tab) {
        this.tabItems = [tab]
        this.setActiveTab(tab)
        if (tab.query && tab.query.id) {
          tab.query.reload()
        }
      },
      duplicate(tab) {
        const duplicatedTab = {
            id: uuidv4(),
            type: tab.type,
            connection: tab.connection,
        }

        if(tab.type === 'query') {
          const query = new FavoriteQuery()
          query.text = tab.query.text

          duplicatedTab['title'] = "Query #" + this.newTabId
          duplicatedTab['unsavedChanges'] = true
          duplicatedTab['query'] = query
        } else if(tab.type === 'table') {
          duplicatedTab['table'] = tab.table
        }
        this.addTab(duplicatedTab)
      },
      favoriteClick(item) {
        const queriesOnly = this.tabItems.map((item) => {
          return item.query
        })

        if (queriesOnly.includes(item)) {
          this.click(this.tabItems[queriesOnly.indexOf(item)])
        } else {
          const result = {
            id: uuidv4(),
            type: 'query',
            title: item.title,
            connection: this.connection,
            query: item,
            unsavedChanges: false
          }
          this.addTab(result)
        }        
      },
      createQueryFromItem(item) {
        this.createQuery(item.text)
      }
    },
    beforeDestroy() {
      this.unregisterHandlers(this.rootBindings)
      this.tabItems = []
    },
    mounted() {
      this.createQuery()
      this.registerHandlers(this.rootBindings)
    }
  }
</script>
