<template>
  <div
    class="core-tabs"
    v-hotkey="keymap"
  >
    <div class="tabs-header">
      <!-- <div class="nav-tabs nav"> -->
      <Draggable
        :options="dragOptions"
        v-model="tabItems"
        tag="ul"
        class="nav-tabs nav"
        chosen-class="nav-item-wrap-chosen"
      >
        <core-tab-header
          v-for="tab in tabItems"
          :key="tab.id"
          :tab="tab"
          :tabs-count="tabItems.length"
          :selected="activeTab === tab"
          @click="click"
          @close="close"
          @closeAll="closeAll"
          @closeOther="closeOther"
          @closeToRight="closeToRight"
          @duplicate="duplicate"
        />
      </Draggable>
      <!-- </div> -->
      <span class="actions">
        <a
          @click.prevent="createQuery(null)"
          class="btn-fab add-query"
        ><i class=" material-icons">add_circle</i></a>
      </span>
    </div>
    <div class="tab-content">
      <div class="empty flex-col  expand">
        <div class="expand layout-center">
          <shortcut-hints />
        </div>
        <statusbar class="tabulator-footer" />
      </div>
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="tab.id"
        :class="{ active: (activeTab === tab) }"
        v-show="activeTab === tab"
      >
        <QueryEditor
          v-if="tab.type === 'query'"
          :active="activeTab === tab"
          :tab="tab"
          :tab-id="tab.id"
          :connection="connection"
        />
        <tab-with-table
          v-if="tab.type === 'table'"
          :tab="tab"
          @close="close"
        >
          <template v-slot:default="slotProps">
            <TableTable
              :tab="tab"
              :active="activeTab === tab"
              :connection="connection"
              :initial-filter="tab.filter"
              :table="slotProps.table"
            />
          </template>
        </tab-with-table>
        <tab-with-table
          v-if="tab.type === 'table-properties'"
          :tab="tab"
          @close="close"
        >
          <template v-slot:default="slotProps">
            <TableProperties
              :active="activeTab === tab"
              :tab="tab"
              :tab-id="tab.id"
              :connection="connection"
              :table="slotProps.table"
            />
          </template>
        </tab-with-table>
        <TableBuilder
          v-if="tab.type === 'table-builder'"
          :active="activeTab === tab"
          :tab="tab"
          :tab-id="tab.id"
          :connection="connection"
        />
      </div>
    </div>
    <portal to="modals">
      <modal
        :name="modalName"
        class="beekeeper-modal vue-dialog sure header-sure"
        @opened="sureOpened"
        @closed="sureClosed"
        @before-open="beforeOpened"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            Really {{ this.dbAction | titleCase }} <span class="tab-like"><tab-icon
              :tab="tabIcon"
            /> {{ this.dbElement }}</span>?
          </div>
          <p>This change cannot be undone</p>
        </div>
        <div class="vue-dialog-buttons">
          <span class="expand" />
          <button
            ref="no"
            @click.prevent="$modal.hide(modalName)"
            class="btn btn-sm btn-flat"
          >
            Cancel
          </button>
          <button
            @focusout="sureOpen && $refs.no && $refs.no.focus()"
            @click.prevent="completeDeleteAction"
            class="btn btn-sm btn-primary"
          >
            {{ this.titleCaseAction }} {{ this.dbElement }}
          </button>
        </div>
      </modal>

      <!-- Duplicate Modal -->

      <modal
        :name="duplicateTableModal"
        class="beekeeper-modal vue-dialog sure header-sure"
        @opened="sureOpened"
        @closed="sureClosed"
        @before-open="beforeOpened"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            {{ this.dbAction | titleCase }} <span class="tab-like"><tab-icon :tab="tabIcon" />
              {{ this.dbElement }}</span>?
          </div>
          <div class="form-group">
            <label for="duplicateTableName">New table name</label>
            <input
              type="text"
              name="duplicateTableName"
              class="form-control"
              required
              v-model="duplicateTableName"
              autofocus
            >
          </div>
          <small>This will create a new table and copy all existing data into it. Keep in mind that any indexes,
            relations, or triggers associated with the original table will not be duplicated in the new table</small>
        </div>
        <div class="vue-dialog-buttons">
          <span class="expand" />
          <button
            ref="no"
            @click.prevent="$modal.hide(duplicateTableModal)"
            class="btn btn-sm btn-flat"
          >
            Cancel
          </button>
          <pending-changes-button
            :submit-apply="duplicateTable"
            :submit-sql="duplicateTableSql"
          />
        </div>
      </modal>
    </portal>
  </div>
</template>

<script lang="ts">

import _ from 'lodash'
import { format } from 'sql-formatter';
import QueryEditor from './TabQueryEditor.vue'
import Statusbar from './common/StatusBar.vue'
import CoreTabHeader from './CoreTabHeader.vue'
import TableTable from './tableview/TableTable.vue'
import TableProperties from './TabTableProperties.vue'
import TableBuilder from './TabTableBuilder.vue'
import { AppEvent } from '../common/AppEvent'
import { mapGetters, mapState } from 'vuex'
import Draggable from 'vuedraggable'
import ShortcutHints from './editor/ShortcutHints.vue'
import { FormatterDialect } from '@shared/lib/dialects/models';
import Vue from 'vue';
import { OpenTab } from '@/common/appdb/models/OpenTab';
import TabWithTable from './common/TabWithTable.vue';
import TabIcon from './tab/TabIcon.vue'
import { DatabaseEntity } from "@/lib/db/models"
import PendingChangesButton from './common/PendingChangesButton.vue'

export default Vue.extend({
  props: ['connection'],
  components: {
    Statusbar,
    QueryEditor,
    CoreTabHeader,
    TableTable,
    TableProperties,
    Draggable,
    ShortcutHints,
    TableBuilder,
    TabWithTable,
    TabIcon,
    PendingChangesButton
  },
  data() {
    return {
      showExportModal: false,
      tableExportOptions: null,
      dragOptions: {
        handle: '.nav-item'
      },
      // below are connected to the modal for delete/truncate
      sureOpen: false,
      lastFocused: null,
      dbAction: null,
      dbElement: null,
      dbEntityType: null,
      dbDeleteElementParams: null,
      // below are connected to the modal for duplicate
      dbDuplicateTableParams: null,
      duplicateTableName: null,
    }
  },
  watch: {

  },
  filters: {
    titleCase: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  },
  computed: {
    ...mapState('tabs', { 'activeTab': 'active' }),
    ...mapGetters({ 'menuStyle': 'settings/menuStyle', 'dialect': 'dialect' }),
    tabIcon() {
      return {
        type: this.dbEntityType,
        entityType: this.dbEntityType
      }
    },
    titleCaseAction() {
      return _.capitalize(this.dbAction)
    },
    modalName() {
      return "dropTruncateModal"
    },
    duplicateTableModal() {
      return "duplicateTableModal"
    },
    tabItems: {
      get() {
        return this.$store.getters['tabs/sortedTabs']
      },
      set(newTabs: OpenTab[]) {
        this.$store.dispatch('tabs/reorder', newTabs)
      }
    },
    rootBindings() {
      return [
        { event: AppEvent.closeTab, handler: this.closeCurrentTab },
        { event: AppEvent.newTab, handler: this.createQuery },
        { event: AppEvent.createTable, handler: this.openTableBuilder },
        { event: 'historyClick', handler: this.createQueryFromItem },
        { event: AppEvent.loadTable, handler: this.openTable },
        { event: AppEvent.openTableProperties, handler: this.openTableProperties },
        { event: 'loadSettings', handler: this.openSettings },
        { event: 'loadTableCreate', handler: this.loadTableCreate },
        { event: 'loadRoutineCreate', handler: this.loadRoutineCreate },
        { event: 'favoriteClick', handler: this.favoriteClick },
        { event: 'exportTable', handler: this.openExportModal },
        { event: AppEvent.hideEntity, handler: this.hideEntity },
        { event: AppEvent.hideSchema, handler: this.hideSchema },
        { event: AppEvent.deleteDatabaseElement, handler: this.deleteDatabaseElement },
        { event: AppEvent.dropDatabaseElement, handler: this.dropDatabaseElement },
        { event: AppEvent.duplicateDatabaseTable, handler: this.duplicateDatabaseTable },
      ]
    },
    contextOptions() {
      return [
        { name: "Close", slug: 'close', handler: ({ item }) => this.close(item) },
        { name: "Close Others", slug: 'close-others', handler: ({ item }) => this.closeOther(item) },
        { name: 'Close All', slug: 'close-all', handler: this.closeAll },
        { name: "Close Tabs to Right", slug: 'close-to-right', handler: ({ item }) => this.closeToRight(item) },
        { name: "Duplicate", slug: 'duplicate', handler: ({ item }) => this.duplicate(item) }
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
    },
  },
  methods: {
    completeDeleteAction() {
      const { schema, name: dbName, entityType } = this.dbDeleteElementParams
      if (entityType !== 'table' && this.dbAction == 'truncate') {
        this.$noty.warning("Sorry, you can only truncate tables.")
        return;
      }
      this.$modal.hide(this.modalName)
      this.$nextTick(async () => {
        try {
          if (this.dbAction.toLowerCase() === 'drop') {
            await this.connection.dropElement(dbName, entityType?.toUpperCase(), schema)
            // timeout is more about aesthetics so it doesn't refresh the table right away.

            setTimeout(() => {
              this.$store.dispatch('updateTables')
              this.$store.dispatch('updateRoutines')
            }, 500)
          }

          if (this.dbAction.toLowerCase() === 'truncate') {
            await this.connection.truncateElement(dbName, entityType?.toUpperCase(), schema)
          }

          this.$noty.success(`${this.dbAction} completed successfully`)

        } catch (ex) {
          this.$noty.error(`Error performing ${this.dbAction}: ${ex.message}`)
        }
      })
    },
    async duplicateTableSql() {
      const { tableName, schema, entityType } = this.dbDuplicateTableParams

      if (entityType !== 'table' && this.dbAction == 'duplicate') {
        this.$noty.warning("Sorry, you can only duplicate tables.")
        return;
      }

      if (tableName === this.duplicateTableName) {
        this.$noty.warning("Sorry, you can't duplicate with the same name.")
        return;
      }

      if (this.duplicateTableName === null || this.duplicateTableName === '' || this.duplicateTableName === undefined) {
        this.$noty.warning("Please enter a name for the new table.")
        return;
      }

      try {
        const sql = await this.connection.duplicateTableSql(tableName, this.duplicateTableName, schema)
        const formatted = format(sql, { language: FormatterDialect(this.dialect) })

        const tab = new OpenTab('query')
        tab.unsavedQueryText = formatted
        tab.title = `Duplicating table: ${tableName}`
        tab.active = true
        tab.unsavedChanges = false
        tab.alert = false
        tab.position = 99

        await this.addTab(tab)

      } catch (ex) {
        this.$noty.error(`Error printing ${this.dbAction} query: ${ex.message}`)
      } finally {
        this.$modal.hide(this.duplicateTableModal)
      }
    },
    async duplicateTable() {
      const { tableName, schema, entityType } = this.dbDuplicateTableParams

      if (entityType !== 'table' && this.dbAction == 'duplicate') {
        this.$noty.warning("Sorry, you can only duplicate tables.")
        return;
      }

      if (tableName === this.duplicateTableName) {
        this.$noty.warning("Sorry, you can't duplicate with the same name.")
        return;
      }

      if (this.duplicateTableName === null || this.duplicateTableName === '' || this.duplicateTableName === undefined) {
        this.$noty.warning("Please enter a name for the new table.")
        return;
      }

      this.$modal.hide(this.duplicateTableModal)

      this.$nextTick(async () => {
        try {
          if (this.dbAction.toLowerCase() !== 'duplicate') {
            return
          }

          await this.connection.duplicateTable(tableName, this.duplicateTableName, schema)

          // timeout is more about aesthetics so it doesn't refresh the table right away.
          setTimeout(() => {
            this.$store.dispatch('updateTables')
            this.$store.dispatch('updateRoutines')
          }, 500)


          this.$noty.success(`${this.dbAction} completed successfully`)

        } catch (ex) {
          this.$noty.error(`Error performing ${this.dbAction}: ${ex.message}`)
        } finally {
          this.duplicateTableName = null
          this.dbDuplicateTableParams = null
        }
      })
    },
    beforeOpened() {
      this.lastFocused = document.activeElement
    },
    sureOpened() {
      this.sureOpen = true
      this.$refs.no.focus()
    },
    sureClosed() {
      this.sureOpen = false
      if (this.lastFocused) {
        this.lastFocused.focus()
      }
    },
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
        case 'close-to-right':
          return this.closeToRight(item);
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
      if (this.activeTab == this.lastTab) {
        this.setActiveTab(this.firstTab)
      } else {
        this.setActiveTab(this.tabItems[this.activeIdx + 1])
      }
    },

    previousTab() {
      if (this.activeTab == this.firstTab) {
        this.setActiveTab(this.lastTab)
      } else {
        this.setActiveTab(this.tabItems[this.activeIdx - 1])
      }
    },
    closeCurrentTab() {
      if (this.activeTab) this.close(this.activeTab)
    },
    handleCreateTab() {
      this.createQuery()
    },
    createQuery(optionalText) {
      // const text = optionalText ? optionalText : ""
      let qNum = 0
      let tabName = "New Query"
      do {
        qNum = qNum + 1
        tabName = `Query #${qNum}`
      } while (this.tabItems.filter((t) => t.title === tabName).length > 0);

      const result = new OpenTab('query')
      result.title = tabName,
        result.unsavedChanges = false
      result.unsavedQueryText = optionalText
      this.addTab(result)
    },
    async loadTableCreate(table) {
      let method = null
      if (table.entityType === 'table') method = this.connection.getTableCreateScript
      else if (table.entityType === 'view') method = this.connection.getViewCreateScript
      else if (table.entityType === 'materialized-view') method = this.connection.getMaterializedViewCreateScript
      if (!method) {
        this.$noty.error(`Can't find script for ${table.name} (${table.entityType})`)
        return
      }
      try {
        const result = await method(table.name, table.schema)
        const stringResult = format(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
        this.createQuery(stringResult)  
      } catch (ex) {
        this.$noty.error(`An error occured while loading the SQL for '${table.name}' - ${ex.message}`)
        throw ex
      }

    },
    dropDatabaseElement({ item: dbActionParams, action: dbAction }) {
      this.dbElement = dbActionParams.name
      this.dbAction = dbAction
      this.dbEntityType = dbActionParams.entityType
      this.dbDeleteElementParams = dbActionParams

      this.$modal.show(this.modalName)
    },
    duplicateDatabaseTable({ item: dbActionParams, action: dbAction }) {
      this.dbElement = dbActionParams.name
      this.dbAction = dbAction
      this.dbEntityType = dbActionParams.entityType

      this.duplicateTableName = `${dbActionParams.name}_copy`

      this.dbDuplicateTableParams = {
        tableName: dbActionParams.name,
        schema: dbActionParams.schema,
        entityType: dbActionParams.entityType
      }

      this.$modal.show(this.duplicateTableModal)
    },
    async loadRoutineCreate(routine) {
      const result = await this.connection.getRoutineCreateScript(routine.name, routine.type, routine.schema)
      // const stringResult = format(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
      this.createQuery(_.isArray(result) ? result[0] : result);
    },
    openTableBuilder() {
      const tab = new OpenTab('table-builder')
      tab.title = "New Table"
      tab.unsavedChanges = true
      this.addTab(tab)
    },
    openTableProperties({ table }) {
      const t = new OpenTab('table-properties')
      t.tableName = table.name
      t.schemaName = table.schema
      t.title = table.name
      const existing = this.tabItems.find((tab) => tab.matches(t))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)
      this.addTab(t)
    },
    openTable({ table, filter }) {
      const tab = new OpenTab('table')
      tab.title = table.name
      tab.tableName = table.name
      tab.schemaName = table.schema
      tab.entityType = table.entityType
      tab.filter = filter
      tab.titleScope = "all"
      const existing = this.tabItems.find((t) => t.matches(tab))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)
      this.addTab(tab)
    },
    openExportModal(options) {
      this.tableExportOptions = options
      this.showExportModal = true
    },
    hideEntity(entity: DatabaseEntity) {
      this.$store.dispatch('hideEntities/addEntity', entity)
    },
    hideSchema(schema: string) {
      this.$store.dispatch('hideEntities/addSchema', schema)
    },
    openSettings() {
      const tab = new OpenTab('settings')
      tab.title = "Settings"
      this.addTab(tab)
    },
    async click(tab) {
      await this.setActiveTab(tab)

    },
    async close(tab) {
      if (this.activeTab === tab) {
        if (tab === this.lastTab) {
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
      this.$store.dispatch('tabs/unload')
    },
    closeOther(tab) {
      const others = _.without(this.tabItems, tab)
      this.$store.dispatch('tabs/remove', others)
      this.setActiveTab(tab)
      if (tab.queryId) {
        this.$store.dispatch('data/queries/reload', tab.queryId)
      }
    },
    closeToRight(tab) {
      const tabIndex = _.indexOf(this.tabItems, tab)
      const activeTabIndex = _.indexOf(this.tabItems, this.activeTab)

      const tabsToRight = this.tabItems.slice(tabIndex + 1)

      if (this.activeTab && activeTabIndex > tabIndex) {
        this.setActiveTab(tab)
      }

      this.$store.dispatch('tabs/remove', tabsToRight)
    },
    duplicate(other: OpenTab) {
      const tab = other.duplicate()

      if (tab.type === 'query') {
        tab.title = "Query #" + (this.tabItems.length + 1)
        tab.unsavedChanges = true
      }
      this.addTab(tab)
    },
    favoriteClick(item) {
      const tab = new OpenTab('query')
      tab.title = item.title
      tab.queryId = item.id
      tab.unsavedChanges = false

      const existing = this.tabItems.find((t) => t.matches(tab))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)

      this.addTab(tab)

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
    if (!this.tabItems?.length) {
      this.createQuery()
    }
    this.registerHandlers(this.rootBindings)
  }
})
</script>
