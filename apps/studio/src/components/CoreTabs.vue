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
          @contextmenu="$bks.openMenu({item: tab, options: contextOptions, event: $event})"
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
        <TableTable @setTabTitleScope="setTabTitleScope" :tab="tab" v-if="tab.type === 'table'" :active="activeTab === tab" :tabId="tab.id" :connection="connection" :initialFilter="tab.filter"></TableTable>
        <TableProperties v-if="tab.type === 'table-properties'" :active="activeTab === tab" :tab="tab" :tabId="tab.id" :connection="connection" :table="tab.table"></TableProperties>
        <TableBuilder v-if="tab.type === 'table-builder'" :active="activeTab === tab" :tab="tab" :tabId="tab.id" :connection="connection"></TableBuilder>
        
      </div>
    </div>
  </div>
</template>

<script lang="ts">

  import _ from 'lodash'
  import { format } from 'sql-formatter';
  import QueryEditor from './TabQueryEditor.vue'
  import Statusbar from './common/StatusBar.vue'
  import CoreTabHeader from './CoreTabHeader.vue'
  import { uuidv4 } from '@/lib/uuid'
  import TableTable from './tableview/TableTable.vue'
  import TableProperties from './TabTableProperties.vue'
  import TableBuilder from './TabTableBuilder.vue'
  import {AppEvent} from '../common/AppEvent'
  import { mapGetters, mapState } from 'vuex'
  import Draggable from 'vuedraggable'
  import ShortcutHints from './editor/ShortcutHints.vue'
import { FormatterDialect } from '@shared/lib/dialects/models';
import Vue from 'vue';
import { OpenTab } from '@/common/appdb/models/OpenTab';

  export default Vue.extend({
    props: [ 'connection' ],
    components: { 
      Statusbar,
      QueryEditor,
      CoreTabHeader,
      TableTable,
      TableProperties,
      Draggable,
      ShortcutHints,
      TableBuilder,
    },
    data() {
      return {
        newTabId: 1,
        showExportModal: false,
        tableExportOptions: null,
        dragOptions: {
          handle: '.nav-item'
        },
      }
    },
    watch: {

    },
    computed: {
      ...mapState({ 'activeTab': 'tabs/active', 'tabItems': 'tabs/tabs'}),
      ...mapGetters({ 'menuStyle': 'settings/menuStyle', 'dialect': 'dialect'}),
      rootBindings() {
        return [
          { event: AppEvent.closeTab, handler: this.closeCurrentTab },
          { event: AppEvent.newTab, handler: this.createQuery},
          { event: AppEvent.createTable, handler: this.openTableBuilder},
          { event: 'historyClick', handler: this.createQueryFromItem},
          { event: AppEvent.loadTable, handler: this.openTable },
          { event: AppEvent.openTableProperties, handler: this.openTableProperties},
          { event: 'loadSettings', handler: this.openSettings },
          { event: 'loadTableCreate', handler: this.loadTableCreate },
          { event: 'loadRoutineCreate', handler: this.loadRoutineCreate },
          { event: 'favoriteClick', handler: this.favoriteClick },
          { event: 'exportTable', handler: this.openExportModal },
        ]
      },
      contextOptions() {
        return [
          { name: "Close", slug: 'close', handler: ({item}) => this.close(item)},
          { name: "Close Others", slug: 'close-others', handler: ({item}) => this.closeOther(item)},
          { name: 'Close All', slug: 'close-all', handler: this.closeAll},
          { name: "Duplicate", slug: 'duplicate', handler: ({item}) => this.duplicate(item)}
        ]
      },
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
        const result = {
          'ctrl+tab': this.nextTab,
          'ctrl+shift+tab': this.previousTab,
        }

        return result
      }
    },
    methods: {
      openContextMenu(event, item) {
        this.contextEvent = { event, item }
      },
      contextClick({ option, item }) {
        switch (option.slug) {
          case 'close':
            return this.close(item)
          case 'close-others':
            return this.closeOther(item)
          case 'close-all':
            return this.closeAll();
          case 'duplicate':
            return this.duplicate(item);
        }
      },
      async setActiveTab(tab) {
        await this.$store.dispatch('tabs/setActive', tab)
      },
      async addTab(item: OpenTab) {
        await this.$store.dispatch('tabs/add', item)
        await this.setActiveTab(item)
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
      closeCurrentTab() {
        // eslint-disable-next-line no-debugger
        if (this.activeTab) this.close(this.activeTab)
      },
      handleCreateTab() {
        this.createQuery()
      },
      createQuery(optionalText) {
        // const text = optionalText ? optionalText : ""
        const result = new OpenTab()
        result.title = "Query #" + this.newTabId,
        result.tabType = 'query'
        result.unsavedChanges = false
        result.unsavedQueryText = optionalText

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
        const stringResult = format(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
        this.createQuery(stringResult)
      },
      async loadRoutineCreate(routine) {
        const result = await this.connection.getRoutineCreateScript(routine.name, routine.schema)
        const stringResult = format(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
        this.createQuery(stringResult)
      },
      openTableBuilder() {
        const tab = new OpenTab()
        tab.tabType = 'table-builder'
        tab.title = "New Table"
        tab.unsavedChanges = true
        const t = {
          id: uuidv4(),
          type: 'table-builder',
          connection: this.connection,
          title: "New Table",
          unsavedChanges: true,
        }
        this.addTab(t)
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
          title: `${table.name}`,
        }
        this.addTab(t)
      },
      openTable({ table, filter}) {

        const tab = new OpenTab()
        tab.title = table.name
        tab.tabType = "table"
        tab.filters = filter
        tab.titleScope = "all"
        this.addTab(tab)
      },
      openExportModal(options) {
        this.tableExportOptions = options
        this.showExportModal = true
      },
      openSettings() {
        const tab = new OpenTab()
        tab.tabType = "settings"
        tab.title = "Settings"
        this.addTab(tab)
      },
      async click(tab) {
        await this.setActiveTab(tab)

      },
      async close(tab) {
        if (this.activeTab === tab) {
          if(tab === this.lastTab) {
            this.previousTab()
          } else {
            this.nextTab()
          }
        }
        await this.$store.dispatch("tabs/remove", tab)
        if (tab.queryId) {
          await this.$store.dispatch('data/queries/reload', tab.queryId)
        }
      },
      closeAll() {
        this.dispatch('tabs/unload')
      },
      closeOther(tab) {
        const others = _.without(this.tabItems, tab)
        this.$store.dispatch('remove', others)
        this.setActiveTab(tab)
        if (tab.queryId) {
          this.$store.dispatch('data/queries/reload', tab.queryId)
        }
      },
      duplicate(other: OpenTab) {
        const tab = other.duplicate()

        if(tab.type === 'query') {
          tab.title = "Query #" + this.newTabId
          tab.unsavedChanges = true
        }
        this.addTab(tab)
      },
      favoriteClick(item) {
        const queriesOnly = this.tabItems.map((item) => {
          return item.queryId
        })

        if (queriesOnly.includes(item)) {
          this.click(this.tabItems[queriesOnly.indexOf(item.id)])
        } else {
          const tab = new OpenTab()
          tab.tabType = 'query'
          tab.title = item.title
          tab.queryId = item.id
          tab.unsavedChanges = false

          this.addTab(tab)
        }        
      },
      createQueryFromItem(item) {
        this.createQuery(item.text)
      }
    },
    beforeDestroy() {
      this.unregisterHandlers(this.rootBindings)
    },
    async mounted() {
      await this.$store.dispatch('tabs/load')
      if (!this.tabItems.length) {
        this.createQuery()
      }
      this.registerHandlers(this.rootBindings)
    }
  })
</script>