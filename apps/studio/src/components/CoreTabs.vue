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
          :selected="activeTab?.id === tab.id"
          @click="click"
          @close="close"
          @closeAll="closeAll"
          @closeOther="closeOther"
          @closeToRight="closeToRight"
          @forceClose="forceClose"
          @duplicate="duplicate"
          @copyName="copyName"
          @reloadPluginView="handleReloadPluginView"
        />
      </Draggable>
      <!-- </div> -->
      <span class="actions add-tab-group" id="add-tab-group">
        <a
          @click.prevent="createQuery(null)"
          class="btn-fab add-query"
        ><i class=" material-icons">add</i></a>
        <x-button
          class="btn-fab add-tab-dropdown"
          menu
          v-if="newTabDropdownItems.length > 1"
        >
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <template v-for="(menuItem, index) in newTabDropdownItems">
              <x-menuitem
                :key="index"
                @click.prevent="createTab(menuItem.config)"
              >
                <x-label>
                  <i class="material-icons">{{ menuItem.config.icon }}</i>
                  {{ menuItem.label }}
                </x-label>
                <x-shortcut v-if="menuItem.shortcut" :value="menuItem.shortcut" />
              </x-menuitem>
            </template>
          </x-menu>
        </x-button>
      </span>
      <a
        @click.prevent="showUpgradeModal"
        class="btn btn-brand btn-icon btn-upgrade"
        v-tooltip="'Upgrade for: backup/restore, import from file, larger query results, and more!'"
        v-if="$store.getters.isCommunity"
      >
        <i class="material-icons">stars</i> Upgrade
      </a>
    </div>
    <div class="tab-content">
      <div class="empty-editor-group empty flex-col  expand">
        <div class="expand layout-center">
          <shortcut-hints />
        </div>
      </div>
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="tab.id"
        :class="{active: (activeTab?.id === tab.id)}"
        v-show="activeTab?.id === tab.id"
      >
        <QueryEditor
          v-if="tab.tabType === 'query'"
          :active="activeTab?.id === tab.id"
          :tab="tab"
          :tab-id="tab.id"
          @update-tab="updateTab"
         />
        <Shell
          v-if="tab.tabType === 'shell'"
          :active="activeTab?.id === tab.id"
          :tab="tab"
          :tab-id="tab.id"
        />
        <PluginBase
          v-if="tab.tabType === 'plugin-base'"
          :tab="tab"
          :active="activeTab.id === tab.id"
          :reload="reloader[tab.id]"
          @close="close"
        />
        <PluginShell
          v-if="tab.tabType === 'plugin-shell'"
          :tab="tab"
          :active="activeTab.id === tab.id"
          :reload="reloader[tab.id]"
          @close="close"
        />
        <tab-with-table
          v-if="tab.tabType === 'table'"
          :tab="tab"
          @close="close"
        >
          <template v-slot:default="slotProps">
            <TableTable
              :tab="tab"
              :active="activeTab?.id === tab.id"
              :table="slotProps.table"
            />
          </template>
        </tab-with-table>
        <tab-with-table
          v-if="tab.tabType === 'table-properties'"
          :tab="tab"
          @close="close"
        >
          <template v-slot:default="slotProps">
            <TableProperties
              :active="activeTab?.id === tab.id"
              :tab="tab"
              :tab-id="tab.id"
              :table="slotProps.table"
            />
          </template>
        </tab-with-table>
        <TableBuilder
          v-if="tab.tabType === 'table-builder'"
          :active="activeTab?.id === tab.id"
          :tab="tab"
          :tab-id="tab.id"
        />
        <ImportExportDatabase
          v-if="tab.tabType === 'import-export-database'"
          :schema="tab.schemaName"
          :tab="tab"
          :active="activeTab?.id === tab.id"
          @close="close"
        />
        <DatabaseBackup
          v-if="tab.tabType === 'backup'"
          :connection="connection"
          :is-restore="false"
          :active="activeTab?.id === tab.id"
          :tab="tab"
          @close="close"
        />
        <DatabaseBackup
          v-if="tab.tabType === 'restore'"
          :connection="connection"
          :is-restore="true"
          :active="activeTab?.id === tab.id"
          :tab="tab"
          @close="close"
        />
        <ImportTable
          v-if="tab.tabType === 'import-table'"
          :tab="tab"
          :schema="tab.schemaName"
          :table="tab.tableName"
          :active="activeTab?.id === tab.id"
          :connection="connection"
          @close="close"
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
        <div v-kbd-trap="true">
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
        <div v-kbd-trap="true">
          <div
            class="dialog-content"
            v-if="this.dialectData.disabledFeatures.duplicateTable"
          >
            <div class="dialog-c-title text-center">
              Table Duplication not supported for {{ this.dialectTitle }} yet. Stay tuned!
            </div>
          </div>
          <div
            class="dialog-content"
            v-else
          >
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
                ref="duplicateTableNameInput"
              >
            </div>
            <small>This will create a new table and copy all existing data into it. Keep in mind that any indexes,
              relations, or triggers associated with the original table will not be duplicated in the new table</small>
          </div>
          <div
            v-if="!this.dialectData.disabledFeatures.duplicateTable"
            class="vue-dialog-buttons"
          >
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
        </div>
      </modal>
    </portal>

    <confirmation-modal :id="confirmModalId">
      <template v-slot:title>
        Really close
        <span
          class="tab-like"
          v-if="closingTab"
        >
          <tab-icon :tab="closingTab" /> {{ closingTab.title }}
        </span>
        ?
      </template>
      <template v-slot:message>
        You will lose unsaved changes
      </template>
    </confirmation-modal>

    <sql-files-import-modal @submit="importSqlFiles" />
    <create-collection-modal />
  </div>
</template>

<script lang="ts">

import _ from 'lodash'

import QueryEditor from './TabQueryEditor.vue'
import Statusbar from './common/StatusBar.vue'
import CoreTabHeader from './CoreTabHeader.vue'
import TableTable from './tableview/TableTable.vue'
import TableProperties from './TabTableProperties.vue'
import TableBuilder from './TabTableBuilder.vue'
import ImportExportDatabase from './importexportdatabase/ImportExportDatabase.vue'
import ImportTable from './TabImportTable.vue'
import DatabaseBackup from './TabDatabaseBackup.vue'
import PluginShell from './TabPluginShell.vue'
import PluginBase from './TabPluginBase.vue'
import { AppEvent } from '../common/AppEvent'
import { mapGetters, mapState } from 'vuex'
import Draggable from 'vuedraggable'
import ShortcutHints from './editor/ShortcutHints.vue'
import { FormatterDialect } from '@shared/lib/dialects/models'
import Vue from 'vue';
import { CloseTabOptions } from '@/common/appdb/models/CloseTab';
import TabWithTable from './common/TabWithTable.vue';
import TabIcon from './tab/TabIcon.vue'
import { DatabaseEntity } from "@/lib/db/models"
import PendingChangesButton from './common/PendingChangesButton.vue'
import { DropzoneDropEvent } from '@/common/dropzone'
import { readWebFile } from '@/common/utils'
import Noty from 'noty'
import ConfirmationModal from './common/modals/ConfirmationModal.vue'
import CreateCollectionModal from './common/modals/CreateCollectionModal.vue'
import SqlFilesImportModal from '@/components/common/modals/SqlFilesImportModal.vue'
import Shell from './TabShell.vue'

import { safeSqlFormat as safeFormat } from '@/common/utils';
import { TabTypeConfig, TransportOpenTab, TransportPluginTab, setFilters, matches, duplicate, TabType } from '@/common/transport/TransportOpenTab'
import { wait } from '@/shared/lib/wait'

export default Vue.extend({
  props: [],
  components: {
    Statusbar,
    QueryEditor,
    CoreTabHeader,
    TableTable,
    TableProperties,
    ImportExportDatabase,
    ImportTable,
    Draggable,
    ShortcutHints,
    TableBuilder,
    TabWithTable,
    TabIcon,
    DatabaseBackup,
    PendingChangesButton,
    ConfirmationModal,
    SqlFilesImportModal,
    CreateCollectionModal,
    Shell,
    PluginShell,
    PluginBase,
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
      closingTab: null,
      confirmModalId: 'core-tabs-close-confirmation',
      reloader: {},
    }
  },
  watch: {
    async usedConfig() {
      await this.$store.dispatch('tabs/load')
      if (!this.tabItems?.length) {
        await this.createQuery()
      }
      wait(800).then(() => this.$tour.start("connectedScreen"));
    }
  },
  filters: {
    titleCase: function (value) {
      if (!value) return ''
      value = value.toString()
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  },
  computed: {
    ...mapState(['selectedSidebarItem']),
    ...mapState('tabs', { 'activeTab': 'active', 'tabs': 'tabs' }),
    ...mapState(['connection', 'connectionType', 'usedConfig']),
    ...mapGetters({
       'dialect': 'dialect',
       'dialectData': 'dialectData',
       'dialectTitle': 'dialectTitle',
       'newTabDropdownItems': 'tabs/newTabDropdownItems',
    }),
    tabIcon() {
      return {
        type: this.dbEntityType,
        tabType: this.dbEntityType,
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
      set(newTabs: TransportOpenTab[]) {
        this.$store.dispatch('tabs/reorder', newTabs)
      }
    },
    rootBindings() {
      return [
        { event: AppEvent.closeTab, handler: this.closeCurrentTab },
        { event: AppEvent.closeAllTabs, handler: this.closeAll },
        { event: AppEvent.newTab, handler: this.createQuery },
        { event: AppEvent.newCustomTab, handler: this.addTab },
        { event: AppEvent.createTable, handler: this.openTableBuilder },
        { event: AppEvent.createTableFromFile, handler: this.beginImport },
        { event: 'historyClick', handler: this.createQueryFromItem },
        { event: AppEvent.loadTable, handler: this.openTable },
        { event: AppEvent.openTableProperties, handler: this.openTableProperties },
        { event: 'loadSettings', handler: this.openSettings },
        { event: 'loadTableCreate', handler: this.loadTableCreate },
        { event: 'loadRoutineCreate', handler: this.loadRoutineCreate },
        { event: 'favoriteClick', handler: this.favoriteClick },
        { event: 'exportTable', handler: this.openExportModal },
        { event: AppEvent.toggleHideEntity, handler: this.toggleHideEntity },
        { event: AppEvent.toggleHideSchema, handler: this.toggleHideSchema },
        { event: AppEvent.deleteDatabaseElement, handler: this.deleteDatabaseElement },
        { event: AppEvent.dropDatabaseElement, handler: this.dropDatabaseElement },
        { event: AppEvent.duplicateDatabaseTable, handler: this.duplicateDatabaseTable },
        { event: AppEvent.dropzoneDrop, handler: this.handleDropzoneDrop },
        { event: AppEvent.promptQueryExport, handler: this.handlePromptQueryExport },
        { event: AppEvent.exportTables, handler: this.importExportTables },
        { event: AppEvent.backupDatabase, handler: this.backupDatabase },
        { event: AppEvent.beginImport, handler: this.beginImport },
        { event: AppEvent.restoreDatabase, handler: this.restoreDatabase },
        { event: AppEvent.switchUserKeymap, handler: this.switchUserKeymap },
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
      const result = this.$vHotkeyKeymap({
        'tab.nextTab': this.nextTab,
        'tab.previousTab': this.previousTab,
        'tab.reopenLastClosedTab': this.reopenLastClosedTab,
        'tab.switchTab1': this.handleSwitchTab.bind(this, 0),
        'tab.switchTab2': this.handleSwitchTab.bind(this, 1),
        'tab.switchTab3': this.handleSwitchTab.bind(this, 2),
        'tab.switchTab4': this.handleSwitchTab.bind(this, 3),
        'tab.switchTab5': this.handleSwitchTab.bind(this, 4),
        'tab.switchTab6': this.handleSwitchTab.bind(this, 5),
        'tab.switchTab7': this.handleSwitchTab.bind(this, 6),
        'tab.switchTab8': this.handleSwitchTab.bind(this, 7),
        'tab.switchTab9': this.handleSwitchTab.bind(this, 8),
      })
      // FIXME (azmi): move this to default config file
      if(this.$config.isMac) {
        result['meta+shift+t'] = this.reopenLastClosedTab
      }

      return result
    },
  },
  created() {
    this.$root.$refs.CoreTabs = this;
  },
  methods: {
    async updateTab(tab: TransportOpenTab) {
      const newTab = Object.assign({}, tab);
      await this.$store.commit('tabs/replaceTab', newTab);
    },
    showUpgradeModal() {
      this.$root.$emit(AppEvent.upgradeModal)
    },
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
            await this.connection.dropElement(dbName, entityType?.toUpperCase(), schema);
            // timeout is more about aesthetics so it doesn't refresh the table right away.

              setTimeout(() => {
                this.$store.dispatch('updateTables')
                this.$store.dispatch('updateRoutines')
              }, 500)
            }

          // TODO (@day): is this right?
          if (this.dbAction.toLowerCase() === 'truncate') {
            await this.connection.truncateElement(dbName, entityType?.toUpperCase(), schema);
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
        const sql = await this.connection.duplicateTableSql(tableName, this.duplicateTableName, schema);
        const formatted = safeFormat(sql, { language: FormatterDialect(this.dialect) })

        const tab = {} as TransportOpenTab;
        tab.tabType = 'query';
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

          await this.connection.duplicateTable(tableName, this.duplicateTableName, schema);

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
      if (this.$refs.duplicateTableNameInput) {
        this.$refs.duplicateTableNameInput.focus()
      } else {
        this.$refs.no.focus()
      }
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
    async setActiveTab(tab: TransportOpenTab) {
      const switchingTab = tab.id !== this.activeTab?.id
      if (switchingTab) {
        this.trigger(AppEvent.switchingTab, tab)
      }
      await this.$store.dispatch('tabs/setActive', tab)
      if (switchingTab) {
        this.trigger(AppEvent.switchedTab, tab)
      }
    },
    async addTab(item: TransportOpenTab) {
      const savedItem = await this.$store.dispatch('tabs/add', { item, endOfPosition: true })
      await this.setActiveTab(savedItem)
    },
    async reopenLastClosedTab() {
      await this.$store.dispatch("tabs/reopenLastClosedTab")
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
    closeCurrentTab(_id?:number, options?: CloseTabOptions) {
      if (this.activeTab) this.close(this.activeTab, options)
    },
    async createTab(config: TabTypeConfig.Config) {
      if (config.type === "query") {
        this.createQuery()
      } else if (config.type === "shell") {
        this.createShell()
      } else if (config.type === "plugin-shell" || config.type === "plugin-base") {
        let tNum = 0;
        let title = config.name;
        do {
          tNum = tNum + 1;
          title = `${config.name} #${tNum}`;
        } while (this.tabItems.filter((t) => t.title === title).length > 0);

        const tab = {
          tabType: config.type,
          title,
          unsavedChanges: false,
          context: {
            pluginId: config.pluginId,
            pluginTabTypeId: config.pluginTabTypeId,
            command: config.menuItem?.command,
            params: config.menuItem?.params,
          },
        } as TransportPluginTab;
        await this.addTab(tab)
      }
    },
    async createShell() {
      let sNum = 0;
      let tabName = "Shell";
      do {
        sNum = sNum + 1;
        tabName = `Shell #${sNum}`;
      } while (this.tabItems.filter((t) => t.title === tabName).length > 0);

      const result = {} as TransportOpenTab;
      result.tabType = 'shell';
      result.title = tabName;
      result.unsavedChanges = false;
      await this.addTab(result);
    },
    getNextQueryTitle(queryTitle?) {
      let qNum = 0;
      let tabName = "New Query";
      if (queryTitle) {
        tabName = queryTitle
      } else {
        do {
          qNum = qNum + 1;
          tabName = `Query #${qNum}`;
        } while (this.tabItems.filter((t) => t.title === tabName).length > 0);
      }

      return tabName;
    },
    async createQuery(optionalText, queryTitle?) {
      // const text = optionalText ? optionalText : ""
      console.log("Creating tab")
      const tabName = this.getNextQueryTitle(queryTitle);

      const result = {} as TransportOpenTab;
      result.tabType = 'query'
      result.title = tabName,
      result.unsavedChanges = false
      result.unsavedQueryText = optionalText
      await this.addTab(result)
    },
    async loadTableCreate(table) {
      let method = null
      if (table.entityType === 'table') method = 'getTableCreateScript'
      else if (table.entityType === 'view') method = 'getViewCreateScript'
      else if (table.entityType === 'materialized-view') method = 'getMaterializedViewCreateScript'
      if (!method) {
        this.$noty.error(`Can't find script for ${table.name} (${table.entityType})`)
        return
      }
      try {
        const result = await this.connection[method](table.name, table.schema);
        const stringResult = safeFormat(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
        this.createQuery(stringResult)
      } catch (ex) {
        this.$noty.error(`An error occured while loading the SQL for '${table.name}' - ${ex.message}`)
        throw ex
      }

    },
    dropDatabaseElement({ item: dbActionParams, action: dbAction }) {
      this.dbElement = dbActionParams.name || dbActionParams.schema
      this.dbAction = dbAction
      this.dbEntityType = dbActionParams.entityType || 'schema'
      this.dbDeleteElementParams = dbActionParams

      this.$modal.show(this.modalName)
    },
    importExportTables() {
      // we want this to open a tab with the schema and tables open
      const t = { tabType: 'import-export-database' }
      t.title = `Data Export`
      t.unsavedChanges = false
      const existing = this.tabItems.find((tab) => matches(tab, t))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)
      this.addTab(t)
    },
    backupDatabase() {
      const t = { tabType: 'backup' }
      t.title = 'Backup';
      t.unsavedChanges = false;
      const existing = this.tabItems.find((tab) => matches(tab, t));
      if (existing) return this.$store.dispatch('tabs/setActive', existing);
      this.addTab(t);
    },
    beginImport(data = {}) {
      const { table } = data
      if (table && table.entityType !== 'table') {
        this.$noty.error("You can only import data into a table")
        return;
      }
      const t = { tabType: 'import-table' }
      t.title = table ? `Import Table: ${table.name}` : 'Create Table and Import Data'
      t.unsavedChanges = false
      if (table) {
        t.schemaName = table.schema
        t.tableName = table.name
      }
      const existing = this.tabItems.find(tab => matches(tab, t))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)
      this.addTab(t)
    },
    restoreDatabase() {
      const t = { tabType: 'restore' };
      t.title = 'Restore';
      t.unsavedChanges = false;
      const existing = this.tabItems.find((tab) => matches(tab, t));
      if (existing) return this.$store.dispatch('tabs/setActive', existing);
      this.addTab(t);
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
    async handleDropzoneDrop(event: DropzoneDropEvent) {
      const files = event.files.map((file) => ({
        file,
        error: false,
      }))

      if (!files.every(({ file }) => file.name.endsWith('.sql'))) {
        this.$noty.error('Only .sql files are supported')
        return
      }

      let readerAbort: () => void;
      let aborted  = false;

      function abort() {
        if (typeof readerAbort === 'function') {
          readerAbort()
        }
        aborted = true
      }

      const notyQueue = 'load-queries'
      const notyText = `Loading <span class="counter">1</span> of ${files.length} files`

      const noty = this.$noty.info(notyText,  {
        queue: notyQueue,
        allowRawHtml: true,
        buttons: [
          Noty.button('Abort', 'btn btn-danger', abort)
        ],
      })

      const counter = noty.barDom.querySelector('.counter')

      for (let i = 0; i < files.length; i++) {
        if (aborted) {
          break
        }

        counter.textContent = `${i + 1}`

        const file = files[i].file

        const reader = readWebFile(file)
        readerAbort = reader.abort

        try {
          const text = await reader.result
          if (text) {
            this.$root.$emit(AppEvent.newTab, text);
          } else {
            files[i].error = true
          }
        } catch (e) {
          if (e.message.includes(/abort/)) {
            break
          } else {
            files[i].error = true
          }
        }
      }

      if (aborted) {
        this.$noty.info('Loading aborted', { killer: notyQueue })
      } else if (files.some(({ error }) => error)) {
        this.$noty.error('Some files could not be loaded', { killer: notyQueue })
      } else {
        this.$noty.success('All files loaded', { killer: notyQueue })
      }

      noty.close()
    },
    async importSqlFiles(paths: string[]) {
      const files = paths.map((path) => ({
        path,
        name: path.replace(/^.*[\\/]/, '').replace(/\.sql$/, ''),
        error: false,
      }))

      let readerAbort: () => void;
      let aborted  = false;

      function abort() {
        if (typeof readerAbort === 'function') {
          readerAbort()
        }
        aborted = true
      }

      const notyQueue = 'load-queries'
      const notyText = `Loading <span class="counter">1</span> of ${files.length} files`

      const noty = this.$noty.info(notyText,  {
        queue: notyQueue,
        allowRawHtml: true,
        buttons: [
          Noty.button('Abort', 'btn btn-danger', abort)
        ],
      })

      const counter = noty.barDom.querySelector('.counter')

      for (let i = 0; i < files.length; i++) {
        if (aborted) {
          break
        }

        const file = files[i]

        counter.textContent = `${i + 1}`

        try {
          // TODO (azmi): this process can take longer by accident. Consider
          // an ability to cancel reading file.
          const text = await this.$util.send('file/read', { path: file.path, options: { encoding: 'utf8', flag: 'r' }})
          if (text) {
            const query = await this.$util.send('appdb/query/new');
            query.title = file.name
            query.text = text
            await this.$store.dispatch('data/queries/save', query)
          } else {
            files[i].error = true
          }
        } catch (e) {
            files[i].error = true
        }
      }

      if (aborted) {
        this.$noty.info('Loading aborted', { killer: notyQueue })
      } else if (files.some(({ error }) => error)) {
        this.$noty.error('Some files could not be loaded', { killer: notyQueue })
      } else {
        this.$noty.success('All files loaded', { killer: notyQueue })
      }
    },
    async handlePromptQueryExport(query) {
      const safeFilename = query.title.replace(/[/\\?%*:|"<>]/g, '_');
      const fileName = `${safeFilename}.sql`;

      const lastExportPath = await Vue.prototype.$settings.get("lastExportPath", await window.main.defaultExportPath(fileName));

      const filePath = this.$native.dialog.showSaveDialogSync({
        title: "Export Query",
        defaultPath: lastExportPath,
        filters: [
          { name: 'SQL (*.sql)', extensions: ['sql'] },
          { name: 'All Files (*.*)', extensions: ['*'] },
        ],
      })

      // do nothing if canceled
      if (!filePath) return

      const notyQueue = 'export-query'
      this.$noty.info('Exporting query',  { queue: notyQueue })

      try {
        await this.$util.send('file/write', { path: filePath, text: query.text, options: { encoding: 'utf8' }})
        this.$noty.success('Query exported!', { killer: notyQueue })
      } catch (e) {
        console.error(e)
        this.$noty.error('Query could not be exported. See console for details.', { killer: notyQueue })
      }
    },
    async loadRoutineCreate(routine) {
      const result = await this.connection.getRoutineCreateScript(routine.name, routine.type, routine.schema);
      const stringResult = safeFormat(_.isArray(result) ? result[0] : result, { language: FormatterDialect(this.dialect) })
      this.createQuery(stringResult);
    },
    switchUserKeymap(value) {
      this.$store.dispatch('settings/save', { key: 'keymap', value: value });
    },
    openTableBuilder() {
      if (this.connectionType === 'mongodb') {
        this.$root.$emit(AppEvent.openCreateCollectionModal);
        return;
      }
      const tab = {} as TransportOpenTab;
      tab.tabType = 'table-builder';
      tab.title = "New Table"
      tab.unsavedChanges = true
      this.addTab(tab)
    },
    openTableProperties({ table }) {
      const t = {} as TransportOpenTab;
      t.tabType = 'table-properties';
      t.tableName = table.name ?? table.tableName
      t.schemaName = table.schema ?? table.schemaName
      t.title = table.name ?? table.tableName
      const existing = this.tabItems.find((tab) => matches(tab, t))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)
      this.addTab(t)
    },
    async openTable({ table, filters }) {
      let tab = {} as TransportOpenTab;
      tab.tabType = 'table';
      tab.title = table.name ?? table.tableName
      tab.tableName = table.name ?? table.tableName
      tab.schemaName = table.schema ?? table.schemaName
      tab.entityType = table.entityType
      tab = setFilters(tab, filters)
      tab.titleScope = "all"
      let existing = this.tabItems.find((t) => matches(t, tab))
      if (existing) {
        if (filters) {
          existing = setFilters(existing, filters)
        }
        await this.$store.dispatch('tabs/setActive', existing)
      } else {
        await this.addTab(tab)
      }
    },
    openExportModal(options) {
      this.tableExportOptions = options
      this.showExportModal = true
    },
    toggleHideEntity(entity: DatabaseEntity, hide: boolean) {
      if (hide) this.$store.dispatch('hideEntities/addEntity', entity)
      else this.$store.dispatch('hideEntities/removeEntity', entity)
    },
    toggleHideSchema(schema: string, hide: boolean) {
      if (hide) this.$store.dispatch('hideEntities/addSchema', schema)
      else this.$store.dispatch('hideEntities/removeSchema', schema)
    },
    openSettings() {
      const tab = {} as TransportOpenTab
      tab.tabType = 'settings'
      tab.title = "Settings"
      this.addTab(tab)
    },
    async click(tab) {
      await this.setActiveTab(tab)

    },
    handleSwitchTab(n: number) {
      const tab = this.tabItems[n]
      if(tab) this.setActiveTab(tab)
    },
    async close(tab: TransportOpenTab, options?: CloseTabOptions) {
      if (tab.unsavedChanges && !options?.ignoreUnsavedChanges) {
        this.closingTab = tab
        const confirmed = await this.$confirmById(this.confirmModalId);
        this.closingTab = null
        if (!confirmed) return
      }

      this.trigger(AppEvent.closingTab, tab)

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

      const { schemaName, tabType, tableName } = tab;
      const closingSidebarItem = `${tabType}.${schemaName}.${tableName}`;
      if(closingSidebarItem === this.selectedSidebarItem){
        this.$store.commit('selectSidebarItem', null);
      }
    },
    async forceClose(tab: TransportOpenTab) {
      // ensure the tab is active
      this.$store.dispatch('tabs/setActive', tab);
      switch (tab.tabType) {
        case 'backup':
        case 'restore':
          break;
        default:
          console.log('No force close behaviour defined for tab type')
      }
      await this.close(tab);
    },
    async closeAll() {
      const unsavedTabs = this.tabs.filter((tab) => tab.unsavedChanges)
      if (unsavedTabs.length > 0) {
        const confirmed = await this.$confirm(
          'Close all tabs?',
          `You have ${unsavedTabs.length} unsaved ${window.main.pluralize('tab', unsavedTabs.length)}. Are you sure?`
        )
        if (!confirmed) return
      }
      this.$store.dispatch('tabs/unload')
    },
    async closeOther(tab: TransportOpenTab) {
      const others = _.without(this.tabItems, tab)
      const unsavedTabs = others.filter((t) => t.unsavedChanges)
      if (unsavedTabs.length > 0) {
        const confirmed = await this.$confirm(
          'Close other tabs?',
          `You have ${unsavedTabs.length} unsaved ${window.main.pluralize('tab', unsavedTabs.length)}. Are you sure?`
        )
        if (!confirmed) return
      }

      this.$store.dispatch('tabs/remove', others)
      this.setActiveTab(tab)
      if (tab.queryId) {
        this.$store.dispatch('data/queries/reload', tab.queryId)
      }
    },
    async closeToRight(tab: TransportOpenTab) {
      const tabIndex = _.indexOf(this.tabItems, tab)
      const activeTabIndex = _.indexOf(this.tabItems, this.activeTab)

      const tabsToRight = this.tabItems.slice(tabIndex + 1)
      const unsavedTabs = tabsToRight.filter((t) => t.unsavedChanges)
      if (unsavedTabs.length > 0) {
        const confirmed = await this.$confirm(
          'Close tabs to the right?',
          `You have ${unsavedTabs.length} unsaved ${window.main.pluralize('tab', unsavedTabs.length)} to be closed. Are you sure?`
        )
        if (!confirmed) return
      }

      if (this.activeTab && activeTabIndex > tabIndex) {
        this.setActiveTab(tab)
      }

      this.$store.dispatch('tabs/remove', tabsToRight)
    },
    duplicate(other: TransportOpenTab) {
      const tab = duplicate(other);

      if (tab.tabType === 'query') {
        tab.title = "Query #" + (this.tabItems.length + 1)
        tab.unsavedChanges = true
      }
      this.addTab(tab)
    },
    favoriteClick(item) {
      const tab = {} as TransportOpenTab
      tab.tabType = 'query'
      tab.title = item.title
      tab.queryId = item.id
      tab.unsavedChanges = false

      const existing = this.tabItems.find((t) => matches(t, tab))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)

      this.addTab(tab)

    },
    async createQueryFromItem(item) {
      const tab = {} as TransportOpenTab;
      tab.tabType = 'query';
      tab.title = this.getNextQueryTitle();
      if (item.id) {
        tab.usedQueryId = item.id;
      }
      tab.unsavedChanges = false;

      const existing = this.tabItems.find((t) => matches(t, tab))
      if (existing) return this.$store.dispatch('tabs/setActive', existing)

      this.addTab(tab);
    },
    copyName(item) {
      if (item.tabType !== 'table' && item.tabType !== "table-properties") return;
      this.$copyText(item.tableName)
    },
    handleReloadPluginView(tab) {
      this.reloader = {
        ...this.reloader,
        [tab.id]: Date.now(),
      }
    },
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },

  async mounted() {
    this.registerHandlers(this.rootBindings)
  }
})
</script>

<style lang="scss">
  .add-tab-dropdown {
    padding: 0 0 !important;
  }
</style>
