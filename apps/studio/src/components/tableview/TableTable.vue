<template>
  <div
    v-hotkey="keymap"
    class="tabletable tabcontent flex-col"
    :class="{'view-only': !editable}"
  >
    <editor-modal
      ref="editorModal"
      :binary-encoding="$bksConfig.ui.general.binaryEncoding"
      @save="onSaveEditorModal"
    />
    <template v-if="!table && initialized">
      <div class="no-content" />
    </template>
    <template v-else>
      <row-filter-builder
        v-if="table.columns && table.columns.length"
        :columns="table.columns"
        :reactive-filters="tableFilters"
        @input="handleRowFilterBuilderInput"
        @submit="triggerFilter"
      />
      <div
        v-show="isEmpty"
        class="empty-placeholder"
      >
        No Data
      </div>
      <div
        class="table-view-wrapper"
        ref="tableViewWrapper"
      >
        <div
          ref="table"
          class="spreadsheet-table"
        />
      </div>
      <ColumnFilterModal
        :modal-name="columnFilterModalName"
        :columns-with-filter-and-order="columnsWithFilterAndOrder"
        :has-pending-changes="pendingChangesCount > 0"
        @changed="applyColumnChanges"
      />
    </template>

    <statusbar :mode="statusbarMode" :active="active">
      <div class="truncate statusbar-info">
        <x-button
          @click.prevent="openProperties"
          class="btn btn-flat btn-icon end"
          title="View Structure"
        >
          Structure <i class="material-icons">north_east</i>
        </x-button>
        <!-- Info -->
        <table-length
          v-if="!minimalMode"
          :table="table"
          :filters="filters"
        />
        <a
          @click="refreshTable"
          tabindex="0"
          role="button"
          class="statusbar-item hoverable"
          v-if="lastUpdatedText && !error && !minimalMode"
          :title="'Updated' + ' ' + lastUpdatedText"
        >
          <i class="material-icons">update</i>
          <span>{{ lastUpdatedText }}</span>
        </a>
        <span
          v-if="error"
          class="statusbar-item error"
          :title="error.message"
        >
          <i class="material-icons">error_outline</i>
          <span class="">{{ error.title }}</span>
        </span>
      </div>

      <!-- Pagination -->
      <div
        v-if="!minimalMode"
        class="tabulator-paginator"
      >
        <div class="flex-center flex-middle flex">
          <a
            v-if="(this.page > 1)"
            @click="page = 1"
            v-tooltip="$bksConfig.keybindings.tableTable.firstPage"
          ><i
            class="material-icons"
          >first_page</i></a>
          <a
            v-if="(this.page > 1)"
            @click="page = page - 1"
            v-tooltip="$bksConfig.keybindings.tableTable.previousPage"
          ><i
            class="material-icons"
          >navigate_before</i></a>
          <input
            type="number"
            v-model="page"
          >
          <a
            v-if="hasNextPage"
            @click="page = page + 1"
            v-tooltip="$bksConfig.keybindings.tableTable.nextPage"
          ><i class="material-icons">navigate_next</i></a>
          <a
            v-if="hasNextPage && canJumpToLastPage"
            @click="jumpToLastPage"
            v-tooltip="$bksConfig.keybindings.tableTable.lastPage"
          >
            <i class="material-icons">last_page</i>
          </a>
        </div>
      </div>

      <!-- Pending Edits -->
      <div class="col x4 statusbar-actions flex-right">
        <!-- <div v-if="missingPrimaryKey" class="flex flex-right">
          <span class="statusbar-item">
            <i
            class="material-icons text-danger"
            v-tooltip="'Zero (or multiple) primary keys detected, table editing is disabled.'"
            >warning</i>
          </span>
        </div> -->

        <template v-if="pendingChangesCount > 0">
          <x-button
            class="btn btn-flat"
            @click.prevent="discardChanges"
          >
            Reset
          </x-button>
          <x-buttons class="pending-changes">
            <x-button
              class="btn btn-primary btn-badge btn-icon"
              @click.prevent="saveChanges"
              :title="saveButtonText"
              :class="{'error': !!saveError}"
            >
              <i
                v-if="error"
                class="material-icons "
              >error_outline</i>
              <span
                class="badge"
                v-if="!error"
              ><small>{{ pendingChangesCount }}</small></span>
              <span>Apply</span>
            </x-button>
            <x-button
              v-if="dialect !== 'mongodb'"
              class="btn btn-primary"
              menu
            >
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="saveChanges">
                  <x-label>Apply</x-label>
                  <x-shortcut value="Control+S" />
                </x-menuitem>
                <x-menuitem @click.prevent="copyToSql">
                  <x-label>Copy to SQL</x-label>
                  <x-shortcut value="Control+Shift+S" />
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </template>
        <span
          v-else
          class="hidden-column-count bks-tooltip-wrapper statusbar-item hoverable"
        >
          <a
            tabindex="0"
            @click.prevent="showColumnFilterModal"
            v-if="hiddenColumnCount"
          >
            <i class="material-icons">visibility_off</i>
          </a>
          <div class="bks-tooltip bks-tooltip-top-center">
            <span>{{ hiddenColumnMessage }}</span>
          </div>
        </span>

        <template v-if="!editable">
          <span
            class="statusbar-item item-notice"
            :title="readOnlyNotice"
          >
            <i class="material-icons-outlined">info</i>
            <span> Editing Disabled</span>
          </span>
        </template>

        <!-- Actions -->
        <x-button
          v-tooltip="`Refresh Table (${$bksConfig.keybindings.general.refresh})`"
          class="btn btn-flat"
          @click="refreshTable"
        >
          <i class="material-icons">refresh</i>
        </x-button>
        <x-button
          class="btn btn-flat"
          v-tooltip="addRowTooltip"
          :disabled="usedConfig.readOnlyMode"
          @click.prevent="cellAddRow"
        >
          <i class="material-icons">add</i>
        </x-button>
        <x-button
          class="actions-btn btn btn-flat"
        >
          <i class="material-icons">settings</i>
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <x-menuitem
              v-if="isCassandra"
              @click="cassandraAllowFilter = !this.isCassandra"
            >
              <x-label>
                <i class="material-icons">{{ this.isCassandra ? 'check' : 'horizontal_rule' }}</i>
                Allow Filtering
              </x-label>
            </x-menuitem>
            <x-menuitem @click="exportTable" :disabled="dialectData?.disabledFeatures?.exportTable">
              <x-label>Export whole table</x-label>
            </x-menuitem>

            <x-menuitem @click="exportFiltered" :disabled="dialectData?.disabledFeatures?.exportTable">
              <x-label>Export filtered view</x-label>
            </x-menuitem>
            <x-menuitem @click="showColumnFilterModal">
              <x-label>Hide columns ({{ hiddenColumnCount }})</x-label>
            </x-menuitem>
            <x-menuitem @click="importTab" :disabled="dialectData?.disabledFeatures?.importFromFile || usedConfig.readOnlyMode">
              <x-label>
                Import from file
                <i
                  v-if="$store.getters.isCommunity"
                  class="material-icons menu-icon"
                >stars</i>
              </x-label>
            </x-menuitem>
            <x-menuitem @click="openQueryTab">
              <x-label>Copy view to SQL</x-label>
            </x-menuitem>
          </x-menu>
        </x-button>
      </div>
    </statusbar>

    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        :name="`discard-changes-modal-${tab.id}`"
      >
        <div v-kbd-trap="true">
          <div class="dialog-content">
            <div class="dialog-c-title">
              Confirmation
            </div>
            <div class="modal-form">
              Sorting or Filtering will discard {{ pendingChangesCount }} pending change(s) to <b>{{ table.name }}</b>.
              Are you sure?
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="$modal.hide(`discard-changes-modal-${tab.id}`)"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="button"
              @click.prevent="forceFilter"
              autofocus
            >
              I'm Sure
            </button>
          </div>
        </div>
      </modal>
    </portal>
    <!-- <add-field-modal @done="cellAddCol(undefined, $event)"/> -->
  </div>
</template>

<style>
.item-notice > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.material-icons.menu-icon {
  margin-left: 10px !important;
}
</style>

<script lang="ts">
import Vue from 'vue'
import { ColumnComponent, CellComponent, RangeComponent, RowComponent } from 'tabulator-tables'
import data_converter from "../../mixins/data_converter";
import DataMutators from '../../mixins/data_mutators'
import { FkLinkMixin } from '@/mixins/fk_click'
import Statusbar from '../common/StatusBar.vue'
import RowFilterBuilder from './RowFilterBuilder.vue'
import ColumnFilterModal from './ColumnFilterModal.vue'
import EditorModal from './EditorModal.vue'
import rawLog from '@bksLogger'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
import globals from '@/common/globals';
import {AppEvent} from '../../common/AppEvent';
import { vueEditor } from '@shared/lib/tabulator/helpers';
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import TableLength from '@/components/common/TableLength.vue'
import { mapGetters, mapState } from 'vuex';
import { TableUpdate, TableUpdateResult, ExtendedTableColumn } from '@/lib/db/models';
import { dialectFor, FormatterDialect, TableKey } from '@shared/lib/dialects/models'
import { format } from 'sql-formatter';
import { normalizeFilters, safeSqlFormat, createTableFilter, isNumericDataType, isDateDataType } from '@/common/utils'
import { TableFilter } from '@/lib/db/models';
import { LanguageData } from '../../lib/editor/languageData'
import { escapeHtml, FormatterParams } from '@shared/lib/tabulator';
import { copyRanges, pasteRange, copyActionsMenu, pasteActionsMenu, commonColumnMenu, createMenuItem, resizeAllColumnsToFixedWidth, resizeAllColumnsToFitContent, resizeAllColumnsToFitContentAction } from '@/lib/menu/tableMenu';
import { tabulatorForTableData } from "@/common/tabulator";
import { getFilters, setFilters } from "@/common/transport/TransportOpenTab"
import { ExpandablePath, parseRowDataForJsonViewer } from '@/lib/data/jsonViewer'
import { stringToTypedArray, removeUnsortableColumnsFromSortBy } from "@/common/utils";
import { UpdateOptions } from "@/lib/data/jsonViewer";

const log = rawLog.scope('TableTable')

let draftFilters: TableFilter[] | string | null;

export default Vue.extend({
  components: { Statusbar, ColumnFilterModal, TableLength, RowFilterBuilder, EditorModal },
  mixins: [data_converter, DataMutators, FkLinkMixin],
  props: ["active", 'tab', 'table'],
  data() {
    return {
      addedCol: false,
      filters: [],
      tableFilters: [createTableFilter(this.table.columns?.[0]?.columnName)],
      headerFilter: true,
      columnsSet: false,
      tabulator: null,
      loading: false,
      hasNextPage: false,

      // table data
      data: null, // array of data
      preLoadScrollPosition: null,
      columnWidths: null,
      //
      response: null,
      rawTableKeys: [],
      primaryKeys: null,
      pendingChanges: {
        inserts: [],
        updates: [],
        deletes: []
      },
      paginationStates: [null], // used for pagination that is not based on offsets. Null is always the starter one because that means "just bring back em back from the beginning"
      queryError: null,
      saveError: null,
      timeAgo: new TimeAgo('en-US'),
      lastUpdated: null,
      lastUpdatedText: null,
      // @ts-expect-error Fix typings
      interval: setInterval(this.setlastUpdatedText, 10000),

      forceRedraw: false,
      rawPage: 1,
      initialized: false,
      internalColumnPrefix: "__beekeeper_internal_",
      internalIndexColumn: "__beekeeper_internal_index",
      selectedRowIndex: null,

      /** This is true when we switch to minimal mode while TableTable is not active */
      enabledMinimalModeWhileInactive: false,

      selectedRow: null,
      selectedRowPosition: -1,
      selectedRowData: {},
      expandablePaths: [],
    };
  },
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded', 'usedConfig', 'database', 'workspaceId', 'connectionType', 'connection']),
    ...mapGetters(['dialectData', 'dialect', 'minimalMode']),
    ...mapGetters('popupMenu', ['getExtraPopupMenu']),
    canJumpToLastPage() {
      const dbType = this.connectionType === 'postgresql' ? 'postgres' : this.connectionType;
      return this.$bksConfig.db[dbType].allowSkipToLastPage;
    },
    limit() {
      return this.$bksConfig.ui.tableTable.pageSize
    },
    isEmpty() {
      return _.isEmpty(this.data);
    },
    isCassandra() {
      return this.connectionType === 'cassandra'
    },
    queryDialect() {
      return this.dialectData?.queryDialectOverride ?? this.dialect;
    },
    columnsWithFilterAndOrder() {
      if (!this.tabulator || !this.table) return []
      const cols = this.tabulator.getColumns()
      const columnNames = this.table.columns.map((c) => c.columnName)
      const typeOf = (f) => this.table.columns.find((c) => c.columnName === f)?.dataType
      return cols
        .filter((c) => columnNames.includes(c.getField()))
        .map((c, idx) => ({
        name: c.getField(),
        dataType: typeOf(c.getField()),
        filter: c.isVisible(),
        order: idx
      }))
    },

    page: {
      set(nu) {
        const newPage = Number(nu)
        if (_.isNaN(newPage) || newPage < 1) return
        this.rawPage = newPage
      },
      get() {
        return this.rawPage
      }
    },
    error() {
      return this.saveError ? this.saveError : this.queryError
    },
    saveButtonText() {
      const result = []
      if (this.saveError) {
        result.push(`${this.saveError.title} -`)
      }
      result.push(`${this.pendingChangesCount} pending changes`)
      return result.join(" ")
    },
    keymap() {
      if (!this.active) return {}
      return this.$vHotkeyKeymap({
        'general.refresh': this.refreshTable.bind(this),
        'general.addRow': this.cellAddRow.bind(this),
        'general.save': this.saveChanges.bind(this),
        'general.openInSqlEditor': this.copyToSql.bind(this),
        'general.copySelection': this.copySelection.bind(this),
        'general.pasteSelection': this.pasteSelection.bind(this),
        'general.cloneSelection': this.cloneSelection.bind(this),
        'general.deleteSelection': this.deleteTableSelection.bind(this),
        'tableTable.nextPage': this.navigatePage.bind(this, 'next'),
        'tableTable.lastPage': this.navigatePage.bind(this, 'last'),
        'tableTable.previousPage': this.navigatePage.bind(this, 'prev'),
        'tableTable.firstPage': this.navigatePage.bind(this, 'first'),
        'tableTable.openEditorModal': this.openEditorMenuByShortcut.bind(this),
      })
    },

    tableHolder() {
      return this.$el.querySelector('.tabulator-tableholder')
    },
    allColumnsSelected() {
      return this.columnsWithFilterAndOrder.every((column) => column.filter)
    },
    hiddenColumnCount() {
      return this.columnsWithFilterAndOrder.filter((c) => !c.filter).length
    },
    hiddenColumnMessage() {
      return `${window.main.pluralize('column', this.hiddenColumnCount, true)} hidden`
    },
    pendingChangesCount() {
      return this.pendingChanges.inserts.length
             + this.pendingChanges.updates.length
             + this.pendingChanges.deletes.length
    },
    hasPendingChanges() {
      return this.pendingChangesCount > 0
    },
    hasPendingInserts() {
      return this.pendingChanges.inserts.length > 0
    },
    hasPendingUpdates() {
      return this.pendingChanges.updates.length > 0
    },
    hasPendingDeletes() {
      return this.pendingChanges.deletes.length > 0
    },
    editable() {
      return !this.usedConfig.readOnlyMode &&
        this.primaryKeys?.length &&
        this.table.entityType === 'table' &&
        !this.dialectData.disabledFeatures?.tableTable
    },
    addRowTooltip() {
      return this.usedConfig.readOnlyMode ?
        "Read Only Mode is enabled for this connection. Cannot add rows." :
        `Add row (${this.$bksConfig.keybindings.general.addRow})`;
    },
    readOnlyNotice() {
      if (this.usedConfig.readOnlyMode) {
        return "Read Only Mode is enabled for this connection. Editing is disabled."
      }
      return this.dialectData.notices?.tableTable ||
        "Tables without a primary key column only support inserts. Editing of existing records is disabled."
    },
    // it's a table, but there's no primary key
    missingPrimaryKey() {
      return this.table.entityType === 'table' && !this.primaryKeys?.length
    },
    statusbarMode() {
      if (this.queryError) return 'failure'
      if (this.pendingChangesCount) return 'editing'
      return null
    },
    tableKeys() {
      const result = {}
      this.rawTableKeys.forEach((item) => {
        if (item.isComposite) {
          item.fromColumn.forEach((col) => {
            if (!result[col]) result[col] = [];
            result[col].push(item)
          })
        } else {
          if (!result[item.fromColumn]) result[item.fromColumn] = [];
          result[item.fromColumn].push(item);
        }
      })
      return result
    },
    // we can use this to track if column names have been updated and we need
    // to refresh
    tableColumnNames() {
      return this.table?.columns?.map((c) => c.columnName).join("-") || []
    },
    tableColumns() {
      if (!this.table) return []

      const results = this.table.columns.map(column => this.createColumnFromProps(column));

      // add internal index column
      const result = {
        title: this.internalIndexColumn,
        field: this.internalIndexColumn,
        maxWidth: this.$bksConfig.ui.tableTable.maxColumnWidth,
        maxInitialWidth: this.$bksConfig.ui.tableTable.maxInitialWidth,
        editable: false,
        cellEditCancelled: cell => cell.getRow().normalizeHeight(),
        formatter: this.cellFormatter,
        visible: false,
        clipboard: false,
        print: false,
        download: false
      }
      results.push(result)

      return results
    },

    tableId() {
      // the id for a tabulator table
      if (!this.usedConfig.id) return null;
      return `workspace-${this.workspaceId}.connection-${this.usedConfig.id}.db-${this.database || 'none'}.schema-${this.table.schema || 'none'}.table-${this.table.name}`
    },
    initialSort() {
      // FIXME: Don't specify an initial sort order
      // because it can slow down some databases.
      // However - some databases require an 'order by' for limit, so needs some
      // integration tests first.
      if (!this.table?.columns?.length) {
        return [];
      }

      if (this.dialectData.disabledFeatures?.initialSort) {
        return [];
      }

      return [{ column: this.table.columns[0].columnName, dir: "asc" }];
    },
    shouldInitialize() {
      return this.tablesInitialLoaded && this.active && !this.initialized
    },
    columnFilterModalName() {
      return `column-filter-modal-${this.tableId}`
    },
    openColumnFilterMenuItem() {
      return {
        label: createMenuItem("Open Column Filter"),
        action: this.showColumnFilterModal,
      }
    },
    rootBindings() {
      return [
        { event: AppEvent.switchedTab, handler: this.handleSwitchedTab },
      ]
    },
    /** This tells which fields have been modified */
    selectedRowDataSigns() {
      const signs = {}
      for (const pendingUpdate of this.pendingChanges.updates) {
        if (pendingUpdate.rowIndex === this.selectedRowPosition) {
          signs[pendingUpdate.column] = "changed"
        }
      }
      return signs
    },
    editablePaths() {
      if (!this.table.columns || !this.editable) return []

      const paths = []
      for (const column of this.table.columns) {
        const isPrimaryKey = this.isPrimaryKey(column.columnName);
        // Allow primary key editing for dialects that don't have read-only primary keys (e.g., Redis key renaming)
        const canEditPrimaryKeys = this.dialectData.disabledFeatures?.readOnlyPrimaryKeys === true;

        if((isPrimaryKey && !canEditPrimaryKeys) || this.isForeignKey(column.columnName) || this.isGeneratedColumn(column.columnName)) {
          continue
        }
        paths.push(column.columnName)
      }
      return paths
    },
  },

  watch: {
    filters() {
      this.tabulator?.setData()
    },
    allColumnsSelected() {
      this.resetPendingChanges()
    },
    shouldInitialize() {
      if (this.shouldInitialize) {
        this.initialize()
      }
    },
    page: _.debounce(function () {
      this.tabulator.setPage(this.page || 1)
    }, 500),
    active() {
      if (!this.tabulator) return;
      if (this.active) {
        this.tabulator.restoreRedraw()
        if (this.forceRedraw) {
          this.forceRedraw = false
          this.$nextTick(() => {
            this.tabulator.redraw(true)
          })
        } else {
          // Commenting this because it can cause the column widths to reset
          // this.$nextTick(() => this.tabulator.redraw())
        }

        // If the filters in this.tab have changed, reapply them. We probably
        // clicked a foreign key cell from other tab.
        if (!_.isEqual(getFilters(this.tab), this.tableFilters)) {
          this.tableFilters = getFilters(this.tab)
          this.triggerFilter(this.tableFilters)
        }

        if (this.enabledMinimalModeWhileInactive) {
          this.enabledMinimalModeWhileInactive = false
          resizeAllColumnsToFitContentAction(this.tabulator)
        }

        // $nextTick doesn't work here
        setTimeout(() => {
          this.tabulator.modules.selectRange.restoreFocus()
        })
      } else {
        this.tabulator.blockRedraw()
      }
    },
    async tableColumnNames() {
      if (!this.tabulator) return;

      if (!this.active) this.forceRedraw = true;
      await this.tabulator.setColumns(this.tableColumns)
      await this.refreshTable();
    },
    async lastUpdated() {
      this.setlastUpdatedText()
      const primaryFilter: TableFilter | false = _.isArray(this.filters) &&
        this.filters.find((filter: TableFilter) => this.isPrimaryKey(filter.field));
      let result = 'all'
      if (this.primaryKeys?.length && primaryFilter && primaryFilter.value) {
        log.info("setting scope", primaryFilter.value)
        result = _.truncate(primaryFilter.value.toString())
      } else if (_.isString(this.filters)) {
        result = 'custom'
      }
      this.tab.titleScope = result
      await this.$store.dispatch('tabs/save', this.tab)
    },
    pendingChangesCount() {
      this.tab.unsavedChanges = this.pendingChangesCount > 0
    },
    minimalMode() {
      // Auto resize the columns when the tab is active (not hidden in the DOM)
      // so tabulator can do it correctly.
      if (this.tabulator && this.active) {
        resizeAllColumnsToFitContentAction(this.tabulator)
      }

      // If the tab is not active, we can auto resize later when it's active
      if (!this.active) {
        this.enabledMinimalModeWhileInactive = this.minimalMode
      }
    },
  },
  beforeDestroy() {
    this.handleTabInactive()
    if(this.interval) clearInterval(this.interval)
    if (this.tabulator) {
      this.tabulator.destroy()
    }
    this.unregisterHandlers(this.rootBindings)
  },
  async mounted() {
    if (this.shouldInitialize) {
      await this.$nextTick(async() => {
        await this.initialize()
      })
    }
    if (this.active) {
      this.handleTabActive()
    }
    this.registerHandlers(this.rootBindings)
  },
  methods: {
    createColumnFromProps(column) {
      // 1. add a column for a real column
      // if a FK, add another column with the link
      // to the FK table.
      const cellMenu = (keyDatas?: any[]) => {
        return (_e, cell: CellComponent) => {
          const ranges = cell.getRanges();
          const range = _.last(ranges)
          const menu = [
            this.openEditorMenu(cell),
            this.setAsNullMenuItem(range),
            { separator: true },
            this.quickFilterMenuItem(cell),
            ...copyActionsMenu({
              ranges,
              table: this.table.name,
              schema: this.table.schema,
            }),
            { separator: true },
            ...pasteActionsMenu(range),
            { separator: true },
            ...this.rowActionsMenu(range),
            ...this.getExtraPopupMenu('tableTable.cell', { transform: "tabulator" }),
          ]

          if (keyDatas?.length > 0) {
            keyDatas.forEach(keyData => {
              // For composite foreign keys, show all related columns
              const displayTarget = keyData.isComposite ?
                `${keyData.toTable} (${keyData.toColumn.join(', ')})` :
                `${keyData.toTable} (${keyData.toColumn})`;

              menu.push({
                label: createMenuItem(`Go to ${displayTarget}`),
                action: (_e, cell) => this.fkClick(keyData, cell)
              })
            })
          }

          return menu
        }
      }

      const columnMenu = (_e, column: ColumnComponent) => {
        const ranges = (column as any).getRanges();
        const range = _.last(ranges) as RangeComponent;
        let hideColumnLabel = `Hide ${column.getDefinition().title}`

        if (hideColumnLabel.length > 33) {
          hideColumnLabel = hideColumnLabel.slice(0, 30) + '...'
        }

        return [
          this.setAsNullMenuItem(range),
          { separator: true },
          ...copyActionsMenu({
            ranges,
            table: this.table.name,
            schema: this.table.schema,
          }),
          { separator: true },
          ...commonColumnMenu,
          { separator: true },
          {
            label: createMenuItem(hideColumnLabel),
            action: () => this.hideColumnByField(column.getField()),
          },
          {
            label: createMenuItem(`Reset layout`),
            action: () => column.getTable().setColumnLayout(this.tableColumns),
          },
          this.openColumnFilterMenuItem,
          ...this.getExtraPopupMenu('tableTable.columnHeader', { transform: "tabulator" }),
        ]
      }

      const { disallowedSortColumns = [] } = this.dialectData
      const keyDatas: any[] = Object.entries(this.tableKeys).filter((entry) => entry[0] === column.columnName);
      // this needs fixing
      // currently it doesn't fetch the right result if you update the PK
      // because it uses the PK to fetch the result.
      const slimDataType = this.slimDataType(column.dataType)
      const editorType = this.editorType(column.dataType)
      const useVerticalNavigation = editorType === 'textarea'
      const isPK = this.primaryKeys?.length && this.isPrimaryKey(column.columnName)
      const hasKeyDatas = keyDatas && keyDatas.length > 0
      const columnWidth = this.table.columns.length > 30 ?
        this.defaultColumnWidth(slimDataType, this.$bksConfig.ui.tableTable.defaultColumnWidth) :
        undefined;

      let headerTooltip = escapeHtml(`${column.generated ? '[Generated] ' : ''}${column.columnName} ${column.dataType}`)
      if (hasKeyDatas) {
        const keyData = keyDatas[0][1];
        if (keyData.length === 1) {
          // Handle composite keys
          if (keyData[0].isComposite) {
            // Format as: toTable (column1, column2)
            const compositeColumns = keyData[0].toColumn.join(', ');
            headerTooltip += escapeHtml(` -> ${keyData[0].toTable}(${compositeColumns})`)
          } else {
            // Regular single-column foreign key
            headerTooltip += escapeHtml(` -> ${keyData[0].toTable}(${keyData[0].toColumn})`)
          }
        } else {
          // Multiple foreign keys for the same column
          headerTooltip += escapeHtml(` -> ${keyData.map(item => {
            if (item.isComposite) {
              // Format composite key
              const compositeColumns = item.toColumn.join(', ');
              return `${item.toTable}(${compositeColumns})`;
            } else {
              // Format regular key
              return `${item.toTable}(${item.toColumn})`;
            }
          }).join(', ').replace(/\), (?![\s\S]*\), )/, '), or ')}`)
        }
      } else if (isPK) {
        headerTooltip += ' [Primary Key]'
      }

      let cssClass = 'hide-header-menu-icon';
      if (isPK) {
        cssClass += ' primary-key';
      } else if (hasKeyDatas) {
        cssClass += ' foreign-key';
      } else if (isNumericDataType(column.dataType) || isDateDataType(column.dataType)) {
        cssClass += ' text-right'
      }

      if (column.generated) {
        cssClass += ' generated-column';
      }

      // if column has a comment, add it to the tooltip
      if (column.comment) {
        headerTooltip += `<br/> ${escapeHtml(column.comment)}`
      }

      const formatterParams: FormatterParams = {
        fk: hasKeyDatas && keyDatas[0][1],
        fkOnClick: hasKeyDatas && ((_e, cell) => this.fkClick(keyDatas[0][1].find((k) => !k.isComposite) ?? keyDatas[0][1][0], cell)),
        isPK: isPK,
        binaryEncoding: this.$bksConfig.ui.general.binaryEncoding,
      }

      const result = {
        title: column.columnName,
        field: column.columnName,
        titleFormatter: this.headerFormatter,
        titleFormatterParams: {
          columnName: column.columnName,
          dataType: column.dataType,
          generated: column.generated,
        },
        mutatorData: this.resolveTabulatorMutator(column.dataType, dialectFor(this.connectionType)),
        dataType: column.dataType,
        minWidth: globals.minColumnWidth,
        width: columnWidth,
        maxWidth: globals.maxColumnWidth,
        maxInitialWidth: globals.maxInitialWidth,
        resizable: 'header',
        cssClass,
        editable: this.cellEditCheck,
        headerSort: !this.dialectData.disabledFeatures.headerSort && !disallowedSortColumns.includes(column.dataType?.toLowerCase()),
        editor: editorType,
        tooltip: this.cellTooltip,
        contextMenu: cellMenu(hasKeyDatas ? keyDatas[0][1] : undefined),
        headerContextMenu: columnMenu,
        headerMenu: columnMenu,
        headerTooltip: headerTooltip,
        cellEditCancelled: (cell) => cell.getRow().normalizeHeight(),
        formatter: this.cellFormatter,
        formatterParams,
        editorParams: {
          verticalNavigation: useVerticalNavigation ? 'editor' : undefined,
          dataType: column.dataType,
          search: true,
          allowEmpty: true,
          preserveObject: column.array,
          onPreserveObjectFail: (value: unknown) => {
            log.error('Failed to preserve object for', value)
            return true
          },
          typeHint: column.dataType?.toLowerCase(),
          bksField: column.bksField,
          binaryEncoding: this.$bksConfig.ui.general.binaryEncoding,
        },
      }

      if (column.dataType && /^(bool|boolean)$/i.test(column.dataType)) {
        const values = [
          { label: 'false', value: this.dialectData.boolean?.false ?? false },
          { label: 'true', value: this.dialectData.boolean?.true ?? true },
        ]
        if (column.nullable) values.push({ label: '(NULL)', value: null })
        result.editorParams['values'] = values
      }
      return result;
    },
    handleTab(e: KeyboardEvent) {
      // do nothing?
      log.debug('tab pressed')

    },
    async navigatePage (dir: 'next' | 'prev' | 'first' | 'last') {
      const focusingTable = this.tabulator.element.contains(document.activeElement)
      if (!focusingTable) {
        if (dir === 'next') {
          this.page++
        } else if (dir === 'prev') {
          this.page--
        } else if (dir === 'first') {
          this.page = 1
        } else if (dir === 'last') {
          await this.jumpToLastPage()
        }
      }
    },
    copySelection() {
      if (!this.focusingTable()) return
      copyRanges({ ranges: this.tabulator.getRanges(), type: 'plain' })
    },
    pasteSelection() {
      if (!this.focusingTable() || !this.editable) return
      pasteRange(_.last(this.tabulator.getRanges()))
    },
    deleteTableSelection(_e: Event, range?: RangeComponent) {
      if (!this.focusingTable() || !this.editable) return
      const rows = range ? range.getRows() : this.getSelectedRows()
      this.addRowsToPendingDeletes(rows);
    },
    headerFormatter(_cell, formatterParams) {
      const { columnName, dataType } = formatterParams
      return `
        <span class="title">
          ${escapeHtml(columnName)}
          <span class="badge column-data-type">${escapeHtml(dataType)}</span>
        </span>`
    },
    maybeScrollAndSetWidths() {
      if (this.columnWidths) {
        try {
          this.tabulator.blockRedraw()
          this.columnWidths.forEach(({ field, width}) => {
            const col = this.tabulator.getColumn(field)
            if (col) col.setWidth(width)
          })
          this.columnWidths = null
        } catch (ex) {
          console.error("error setting widths", ex)
        } finally {
          this.tabulator.restoreRedraw()
        }
      }
      if (this.preLoadScrollPosition) {
        this.tableHolder.scrollLeft = this.preLoadScrollPosition
        this.preLoadScrollPosition = null
      }
    },
    async close() {
      this.$root.$emit(AppEvent.closeTab)
    },
    isPrimaryKey(column) {
      return this.primaryKeys?.includes(column);
    },
    isForeignKey(column: string) {
      const keyDatas: any[] = Object.entries(this.tableKeys).filter((entry) => entry[0] === column);
      return keyDatas && keyDatas.length > 0
    },
    isGeneratedColumn(columnName: string) {
      const column: ExtendedTableColumn = this.table.columns.find((col: ExtendedTableColumn) => col.columnName === columnName);
      return column && column.generated;
    },
    async initialize() {
      this.initialized = true
      this.resetPendingChanges()
      await this.$store.dispatch('updateTableColumns', this.table)
      await this.getTableKeys();

      this.tabulator = tabulatorForTableData(this.$refs.table, {
        table: this.table.name,
        schema: this.table.schema,
        persistenceID: this.tableId,
        rowHeader: {
          contextMenu: (_e, cell: CellComponent) => {
            const ranges = cell.getRanges();
            const range = _.last(ranges);
            return [
              this.setAsNullMenuItem(range),
              { separator: true },
              ...copyActionsMenu({
                ranges,
                table: this.table.name,
                schema: this.table.schema,
              }),
              { separator: true },
              ...this.rowActionsMenu(range),
              ...this.getExtraPopupMenu('tableTable.rowHeader', { transform: "tabulator" }),
            ]
          },
          headerContextMenu: () => {
            const ranges = this.tabulator.getRanges();
            const range: RangeComponent = _.last(ranges)
            return [
              this.setAsNullMenuItem(range),
              { separator: true },
              ...copyActionsMenu({
                ranges,
                table: this.table.name,
                schema: this.table.schema,
              }),
              { separator: true },
              resizeAllColumnsToFitContent,
              resizeAllColumnsToFixedWidth,
              this.openColumnFilterMenuItem,
              ...this.getExtraPopupMenu('tableTable.corner', { transform: "tabulator" }),
            ]
          },
        },
        columns: this.tableColumns,
        ajaxURL: "http://fake",
        sortMode: 'remote',
        filterMode: 'remote',
        dataLoaderError: `<span style="display:inline-block">Error loading data, see error below</span>`,
        pagination: true,
        paginationMode: 'remote',
        paginationSize: this.limit,
        paginationElement: this.$refs.paginationArea,
        paginationButtonCount: 0,
        initialSort: this.initialSort,
        initialFilter: this.initialFilters ?? [{}],

        // callbacks
        ajaxRequestFunc: this.dataFetch,
        index: this.internalIndexColumn,
        keybindings: {
          scrollToEnd: false,
          scrollToStart: false,
          scrollPageUp: false,
          scrollPageDown: false
        },
        onRangeChange: this.handleRangeChange,
      });
      this.tabulator.on('cellEdited', this.cellEdited)
      this.tabulator.on('dataProcessed', this.maybeScrollAndSetWidths)
      this.tabulator.on('tableBuilt', () => {
        this.tabulator.modules.selectRange.restoreFocus()
      })
      this.tabulator.on('historyUndo', (action, component) => {
        if (action === "cellEdit") {
          this.cellEdited(component);
        }
      })
      this.tabulator.on('historyRedo', (action, component) => {
        if (action === "cellEdit") {
          this.cellEdited(component);
        }
      })

      this.tableFilters = getFilters(this.tab) || [createTableFilter(this.table.columns?.[0]?.columnName)]
      this.filters = normalizeFilters(this.tableFilters || [])
    },
    rowActionsMenu(range: RangeComponent) {
      const rowRangeLabel = `${range.getTopEdge() + 1} - ${range.getBottomEdge() + 1}`
      return [
        {
          label:
            range.getTopEdge() === range.getBottomEdge()
              ? createMenuItem("Clone row", "Control+D")
              : createMenuItem(`Clone rows ${rowRangeLabel}`, "Control+D"),
          action: this.cellCloneRow.bind(this),
          disabled: !this.editable,
        },
        {
          label:
            range.getTopEdge() === range.getBottomEdge()
              ? createMenuItem("Delete row", "Delete")
              : createMenuItem(`Delete rows ${rowRangeLabel}`, "Delete"),
          action: () => {
            this.tabulator.rowManager.element.focus()
            this.deleteTableSelection(undefined, range)
          },
          disabled: !this.editable,
        },
        { separator: true },
        {
          label: createMenuItem('See details'),
          action: () => {
            this.trigger(AppEvent.selectSecondarySidebarTab, 'json-viewer')
            this.trigger(AppEvent.toggleSecondarySidebar, true)
            this.updateJsonViewer({ range })
          },
        },
      ]
    },
    setAsNullMenuItem(range: RangeComponent) {
      const areAllCellsPrimarykey = range
        .getColumns()
        .every((col) => this.isPrimaryKey(col.getField()));
      return {
        label: createMenuItem("Set as NULL"),
        action: () => range.getCells().flat().forEach((cell) => {
          if (!this.isPrimaryKey(cell.getField())) cell.setValue(null);
        }),
        disabled: areAllCellsPrimarykey || !this.editable,
      }
    },
    isEditorMenuDisabled (cell: CellComponent) {
      if (this.isPrimaryKey(cell.getField())) return true
      return !this.editable && !this.insertionCellCheck(cell)
    },
    getActionValue(cell: CellComponent, s: string) {
      const clickedValue = cell.getValue();
      switch(s) {
        case 'in': {
          const ranges = cell.getRanges();
          const selectedCells = ranges.flatMap(range => range.getCells()).flat();
          const selectedValues = selectedCells
            .filter(c => c.getField() === cell.getField())
            .map(c => c.getValue())
            .filter(v => v !== null && v !== undefined);
          return selectedValues.length > 0 ? selectedValues : [clickedValue];
        }

        case 'like':
          return `%${clickedValue}%`;

        default:
          return clickedValue;
      }
    },
    quickFilterMenuItem(cell: CellComponent) {
      const symbols = [
        '=', '!=', '<', '<=', '>', '>=', 'in', 'like'
      ]
      return {
        label: createMenuItem("Quick Filter", "", this.$store.getters.isCommunity),
        disabled: _.isNil(cell.getValue()),
        menu: symbols.map((s) => {
          return {
            label: createMenuItem(`${cell.getField()} ${s} value`),
            disabled: this.$store.getters.isCommunity,
            action: async (_e, cell: CellComponent) => {
              const newFilter = [{
                field: cell.getField(),
                type: s,
                value: this.getActionValue(cell, s)
              }]
              this.tableFilters = newFilter
              this.triggerFilter(this.tableFilters)
            }
          }
        })
      }
    },
    openCellEditorModal(cell: CellComponent, isReadOnly: boolean) {
      const eventParams = { cell, isReadOnly };
      this.$refs.editorModal.openModal(cell.getValue(), undefined, eventParams)
    },

    openEditorMenuByShortcut() {
      const range: RangeComponent = _.last(this.tabulator.getRanges())
      const cell = range.getCells().flat()[0];
      // FIXME maybe we can avoid calling child methods directly like this?
      // it should be done by calling an event using this.$modal.show(modalName)
      // or this.$trigger(AppEvent.something) if possible
      this.openCellEditorModal(cell, this.isEditorMenuDisabled(cell))
    },
    openEditorMenu(cell: CellComponent) {
      const isReadOnly = this.isEditorMenuDisabled(cell);
      return {
        label: createMenuItem(isReadOnly? "View in modal" : "Edit in modal", "Shift + Enter"),
        action: () => {
          this.openCellEditorModal(cell, isReadOnly)
        }
      }
    },
    onSaveEditorModal(content: string, _l: LanguageData, cell: CellComponent){
      const column = this.table.columns.find((col) => col.columnName === cell.getField());
      const isBinary = column?.bksField?.bksType === 'BINARY' || _.isTypedArray(cell.getValue());

      let value = content;
      if (isBinary) {
        value = stringToTypedArray(content)
      }

      cell.setValue(value)
    },
    openProperties() {
      this.$root.$emit(AppEvent.openTableProperties, { table: this.table })
    },
    buildPendingDeletes() {
      return this.pendingChanges.deletes.map((update) => {
        return _.omit(update, ['row'])
      });
    },
    buildPendingUpdates() {
      return this.pendingChanges.updates.map((update) => {
        return _.omit(update, ['key', 'oldValue', 'cell', 'rowIndex'])
      });
    },
    buildPendingInserts() {
      if (!this.table) return
      const inserts = this.pendingChanges.inserts.map((item) => {
        const columnNames = this.table.columns.filter((c) => !c.generated)
        const rowData = item.row.getData()
        const result = {}
        columnNames.forEach(({ columnName, dataType }) => {
          const d = rowData[columnName]
          if (this.isPrimaryKey(columnName) && (!d && d != 0)) {
            // do nothing
          } else {
            result[columnName] = d
            // HACK (azmi): we should handle this from backend with tests instead
            if (this.dialect === 'postgresql' && dataType === 'jsonb') {
              result[columnName] = JSON.stringify(d)
            }
          }
        })
        return {
          table: this.table.name,
          schema: this.table.schema,
          dataset: this.dialectData.requireDataset ? this.database: null,
          data: [result]
        }
      })
      return inserts
    },
    /**
     * Converts a TableUpdateResult to data that is consumed by Tabulator.updateData
     */
    convertUpdateResult(result: TableUpdateResult) {
      return result.map((row: Record<string, any>) => {
        const internalIndex = this.primaryKeys.map((k: string) => row[k]).join(",");
        return { ...row, [this.internalIndexColumn]: internalIndex };
      });
    },
    defaultColumnWidth(slimType, defaultValue) {
      const chunkyTypes = ['json', 'jsonb', 'blob', 'text', '_text', 'tsvector', 'clob']
      if (chunkyTypes.includes(slimType)) return this.$bksConfig.ui.tableTable.largeFieldWidth
      return defaultValue
    },
    slimDataType(dt) {
      if (!dt) return null
      if(dt === 'bit(1)') return dt
      return dt.split("(")[0]
    },
    editorType(dt) {
      const ne = vueEditor(NullableInputEditorVue)

      // FIXME: Enable once the datetime picker behaves itself
      // when in the table
      // if (helpers.isDateTime(dt)) {
      //   return vueEditor(DateTimePickerEditorVue)
      // }

      switch (dt?.toLowerCase() ?? '') {
        case 'text':
        case 'json':
        case 'jsonb':
        case 'tsvector':
          return 'textarea'
        case 'bool':
        case 'boolean':
          return 'list'
        default: return ne
      }
    },
    cellEditCheck(cell: CellComponent) {
      if (this.isGeneratedColumn(cell.getField())) return false;

      if (this.insertionCellCheck(cell)) return true;

      // check this first because it is easy
      if (!this.editable) return false

      const pendingInsert = _.find(this.pendingChanges.inserts, { row: cell.getRow() })

      if (pendingInsert) {
        return true
      }

      const rowData = cell.getRow().getData()
      const primaryKeys = Object.keys(rowData).filter((k) => this.isPrimaryKey(k))
        .map((key) => ({
          column: key,
          value: rowData[key]
        }))
      const pendingDelete = _.find(this.pendingChanges.deletes, (item) => _.isEqual(item.primaryKeys, primaryKeys))

      const isPrimaryKey = this.isPrimaryKey(cell.getField());
      // i know, the logic is a bit awkward (disable the disabling of editing the primary keys)
      const canEditPrimaryKeys = this.dialectData.disabledFeatures?.readOnlyPrimaryKeys === true;
      return this.editable && (!isPrimaryKey || canEditPrimaryKeys) && !pendingDelete;
    },
    insertionCellCheck(cell: CellComponent) {
      const pendingInsert = _.find(this.pendingChanges.inserts, { row: cell.getRow() });
      return pendingInsert
        ? this.table.entityType === 'table' && !this.dialectData.disabledFeatures?.tableTable
        : false;
    },
    cellEdited(cell) {
      const pkCells = cell.getRow().getCells().filter(c => this.isPrimaryKey(c.getField()))

      // some number fields were being converted to strings so were triggered the cellEdited event because tabulator probably `===` stuff
      // If the cell value does fall into this, we don't want anything edited.
      if (cell.getOldValue() == cell.getValue()) {
        return
      }

      if (!pkCells) {
        this.$noty.error("Can't edit column -- couldn't figure out primary key")
        // cell.setValue(cell.getOldValue())
        cell.restoreOldValue()
        return
      }

      // reflect changes in the detail view
      if (this.positionRowOf(cell.getRow()) === this.selectedRowIndex) {
        cell.getRow().invalidateForeignCache(cell.getField())
        this.updateJsonViewer()
      }

      // Dont handle cell edit if made on a pending insert
      const pendingInsert = _.find(this.pendingChanges.inserts, { row: cell.getRow() })
      if (pendingInsert) {
        pendingInsert.data = pendingInsert.row.getData()
        return
      }

      const column = this.table.columns.find(c => c.columnName === cell.getField())
      const pkValues = pkCells.map((cell) => cell.getValue()).join('-')
      const key = `${pkValues}-${cell.getField()}`

      cell.getElement().classList.add('edited')
      const currentEdit = _.find(this.pendingChanges.updates, { key: key })

      if (typeof currentEdit?.oldValue === 'undefined' && cell.getValue() === null) {
        // don't do anything because of an issue found when trying to set to null, undefined == null so was getting rid of the need to make a change\
      } else if (currentEdit?.oldValue == cell.getValue()) {
        this.$set(this.pendingChanges, 'updates', _.without(this.pendingChanges.updates, currentEdit))
        cell.getElement().classList.remove('edited')
        this.updateJsonViewer()
        return
      }

      const primaryKeys = pkCells.map((pkCell) => {
        return {
          column: pkCell.getField(),
          // Use old value if this primary key cell is the one being edited, otherwise current value
          // This is for redis key renaming to work
          value: pkCell === cell ? pkCell.getOldValue() : pkCell.getValue()
        }
      })
      if (currentEdit) {
        currentEdit.value = cell.getValue()
      } else {
        const payload: TableUpdate & { key: string, oldValue: any, cell: any, rowIndex: number } = {
          key: key,
          table: this.table.name,
          schema: this.table.schema,
          dataset: this.dialectData.requireDataset ? this.database: null,
          column: cell.getField(),
          columnType: column ? column.dataType : undefined,
          columnObject: column,
          primaryKeys,
          oldValue: cell.getOldValue(),
          cell: cell,
          value: cell.getValue(0),
          rowIndex: this.positionRowOf(cell.getRow())
        }
        // remove existing pending updates with identical pKey-column combo
        let pendingUpdates = _.reject(this.pendingChanges.updates, { 'key': payload.key })
        pendingUpdates.push(payload)
        this.$set(this.pendingChanges, 'updates', pendingUpdates)
        this.updateJsonViewer()
      }
    },
    cloneSelection(range?: RangeComponent) {
      const rows = range && range.getRows ? range.getRows() : this.getSelectedRows()
      rows.forEach((row) => {
        const data = { ...row.getData() }
        const dataParsed = Object.keys(data).reduce((acc, d) => {
          if (!this.primaryKeys?.includes(d)) {
            acc[d] = data[d]
          }
          return acc
        }, {})

        this.tabulator.addRow(dataParsed, true).then(row => {
          this.addRowToPendingInserts(row)
          this.tabulator.scrollToRow(row, 'center', true)
        })

      })
    },
    cellCloneRow(_e, cell: CellComponent) {
      this.cloneSelection(_.last(cell.getRanges()))
    },
    cellAddCol(_e, field) {
      if (this.dialectData.disabledFeatures?.tableTable) {
        return;
      }

      if (!field) {
        this.$root.$emit(AppEvent.openAddFieldModal);
        return;
      }

      this.tabulator.addColumn(this.createColumnFromProps({ columnName: field.fieldName, dataType: field.typeHint }), false).then((col) => {
        this.tabulator.scrollToColumn(col, "middle", true)
        this.addedCol = true;
      })
    },
    cellAddRow() {
      if (this.dialectData.disabledFeatures?.tableTable) {
        return;
      }
      this.tabulator.addRow({}, true).then(row => {
        this.addRowToPendingInserts(row)
        this.tabulator.scrollToRow(row, 'center', true)
      })
    },
    getSelectedRows() {
      const ranges: RangeComponent[] = this.tabulator.getRanges()
      const unfilteredRows = ranges.flatMap((range) => range.getRows())
      return _.uniqBy(unfilteredRows, (row) => row.getPosition())
    },
    addRowToPendingInserts(row) {
      row.getElement().classList.add('inserted')

      const payload = {
        table: this.table.name,
        row: row,
        schema: this.table.schema,
        pkColumn: this.primaryKeys
      }

      this.pendingChanges.inserts.push(payload)
    },
    addRowsToPendingDeletes(rows: RowComponent[]) {
      if (_.isEmpty(this.primaryKeys)) {
        this.$noty.error("Can't delete row -- couldn't figure out primary key")
        return
      }

      if (this.hasPendingInserts) {
        const matchingInserts = this.pendingChanges.inserts.filter((insert) => rows.includes(insert.row))
        if (matchingInserts.length > 0) {
          this.$set(this.pendingChanges, 'inserts', this.pendingChanges.inserts.filter((insert) => !rows.includes(insert.row)))
          matchingInserts.forEach((insert) => insert.row.delete())
          return
        }
      }

      const discardedUpdates = []
      const payloads = []

      rows.forEach((row) => {
        const primaryKeys = []

        this.primaryKeys.forEach((pk: string) => {
          const cell = row.getCell(pk)
          const isBinary = cell.getColumn().getDefinition().dataType.toUpperCase().includes('BINARY')
          let value = cell.getValue();
          if (isBinary) {
            try {
              value = stringToTypedArray(value, "hex")
            } catch (e) {
              log.error(`Error converting ${value} to typed array. Skipping...`, e)
            }
          }
          primaryKeys.push({
            column: cell.getField(),
            value,
          })
        })

        const payload = {
          table: this.table.name,
          row,
          schema: this.table.schema,
          dataset: this.dialectData.requireDataset ? this.database: null,
          primaryKeys,
        }

        payloads.push(payload)

        const matchingPrimaryKeys =  (update) => _.isEqual(update.primaryKeys, payload.primaryKeys)

        const filteredUpdates = _.filter(this.pendingChanges.updates, matchingPrimaryKeys)
        discardedUpdates.push(...filteredUpdates)



        row.getElement().classList.add('deleted')

        if (!_.find(this.pendingChanges.deletes, matchingPrimaryKeys)) {
          this.pendingChanges.deletes.push(payload)
        }
      })

      // remove pending updates for the row marked for deletion
      discardedUpdates.forEach(update => this.discardColumnUpdate(update))

      this.$set(this.pendingChanges, 'updates', _.without(this.pendingChanges.updates, discardedUpdates))
    },
    resetPendingChanges() {
      this.pendingChanges = {
        inserts: [],
        updates: [],
        deletes: []
      }
    },
    async copyToSql() {
      this.saveError = null

      try {
        const changes = {
          inserts: this.buildPendingInserts(),
          updates: this.buildPendingUpdates(),
          deletes: this.buildPendingDeletes()
        }
        const sql = await this.connection.applyChangesSql(changes);
        const formatted = format(sql, { language: FormatterDialect(this.queryDialect) })
        this.$root.$emit(AppEvent.newTab, formatted)
      } catch(ex) {
        console.error(ex);
        this.pendingChanges.updates.forEach(edit => {
            edit.cell.getElement().classList.add('edit-error')
        })

        this.pendingChanges.inserts.forEach(insert => {
          insert.row.getElement().classList.add('edit-error')
        })

        this.saveError = {
          title: ex.message,
          message: ex.message,
          ex
        }
        this.$noty.error(ex.message)

        return
      } finally {
        if (!this.active)
          this.forceRedraw = true
      }
    },
    async saveChanges() {
        this.saveError = null

        let replaceData = false

        try {
          const payload = {
            inserts: this.buildPendingInserts(),
            updates: this.buildPendingUpdates(),
            deletes: this.buildPendingDeletes()
          }

          const result = await this.connection.applyChanges(payload);
          const updateIncludedPK = this.pendingChanges.updates.find(e => e.column === e.pkColumn)

          if (updateIncludedPK || this.hasPendingInserts || this.hasPendingDeletes || this.addedCol) {
            replaceData = true
            this.addedCol = false;
          } else if (this.hasPendingUpdates) {
            this.tabulator.clearCellEdited()
            this.tabulator.updateData(this.convertUpdateResult(result))
            this.pendingChanges.updates.forEach(edit => {
              edit.cell.getElement().classList.remove('edited')
              edit.cell.getElement().classList.add('edit-success')
              setTimeout(() => {
                if (edit.cell.getElement()) {
                  edit.cell.getElement().classList.remove('edit-success')
                }
              }, 1000)
            })
          }

          if (replaceData) {
            const niceChanges = window.main.pluralize('change', this.pendingChangesCount, true);
            this.$noty.success(`${niceChanges} successfully applied`)
            this.tabulator.replaceData()
          }

          this.resetPendingChanges()


        } catch (ex) {
          this.pendingChanges.updates.forEach(edit => {
              edit.cell.getElement().classList.add('edit-error')
          })


          this.pendingChanges.inserts.forEach(insert => {
            insert.row.getElement().classList.add('edit-error')
          })

          this.saveError = {
            title: ex.message,
            message: ex.message,
            ex
          }
          this.$noty.error(ex.message)

          return
        } finally {
          this.updateJsonViewerSidebar()
          if (!this.active) {
            this.forceRedraw = true
          }
        }
    },
    discardChanges() {
      this.saveError = null
      this.addedCol = false

      this.pendingChanges.inserts.forEach(insert => this.tabulator.deleteRow(insert.row))

      this.pendingChanges.updates.forEach(edit => this.discardColumnUpdate(edit))

      this.pendingChanges.deletes.forEach(pendingDelete => {
        pendingDelete.row.getElement().classList.remove('deleted')
      })

      this.resetPendingChanges()
    },
    discardColumnUpdate(pendingUpdate) {
      pendingUpdate.cell.setValue(pendingUpdate.oldValue)
      pendingUpdate.cell.getElement().classList.remove('edited')
      pendingUpdate.cell.getElement().classList.remove('edit-error')
    },
    importTab() {
      this.trigger(AppEvent.beginImport, { table: this.table })
    },
    openQueryTab() {
      const page = this.tabulator.getPage();
      const orderBy = [
        _.pick(this.tabulator.getSorters()[0], ["field", "dir"]),
      ];
      const limit = this.tabulator.getPageSize() ?? this.limit;
      const offset = (this.tabulator.getPage() - 1) * limit;
      const selects = ["*"];

      // like if you change a filter
      if (page && page !== this.page) {
        this.page = page;
      }

      this.connection.selectTopSql(
        this.table.name,
        offset,
        limit,
        orderBy,
        this.filters,
        this.table.schema,
        selects
      ).then((query: string) => {
        const language = FormatterDialect(this.queryDialect);
        const formatted = safeSqlFormat(query, { language });
        this.$root.$emit(AppEvent.newTab, formatted);
      }).catch((e: unknown) => {
        log.error("Error opening query tab:", e);
        this.$noty.error("Unable to open query tab. See dev console for details.");
      });
    },
    showColumnFilterModal() {
      this.$modal.show(this.columnFilterModalName)
    },
    triggerFilter(filters: TableFilter[] | string | null) {
      if (this.pendingChangesCount > 0) {
        draftFilters = filters
        this.$modal.show(`discard-changes-modal-${this.tab.id}`)
        return;
      }
      this.filters = filters
    },
    dataFetch(_url, _config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      const { usesOffsetPagination, disallowedSortColumns = [] } = this.dialectData
      log.info("fetch params", params)
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
      let filters = this.filters

      if (params.sort) {
        orderBy = removeUnsortableColumnsFromSortBy(params.sort,  this.table.columns, disallowedSortColumns)
      }

      if (params.size) {
        limit = params.size
      }

      // if (usesOffsetPagination) then use pages otherwise hit the pageState array
      if (params.page) {
        offset = usesOffsetPagination ? (params.page - 1) * limit : this.paginationStates[params.page - 1];
      }

      // like if you change a filter
      if (params.page && params.page !== this.page) {
        this.page = params.page
        this.paginationStates = [null]
      }

      log.info("filters", filters)

      const result = new Promise((resolve, reject) => {
        (async () => {
          try {
            // lets just make column selection a front-end only thing
            const selects = ['*']
            const response = await this.connection.selectTop(
              this.table.name,
              offset,
              this.limit + 1, // +1 to check if there is a next page
              orderBy,
              filters,
              this.table.schema,
              selects
            );

            // TODO(@day): it has come to my attention that the below comment does not properly explain my confusion, where is this allowFilter business coming from and WHY
            // the fuck is this??
            //const response = await this.connection.selectTop(
            //  this.table.name,
            //  offset,
            //  this.limit,
            //  orderBy,
            //  filters,
            //  this.table.schema,
            //  selects,
            //  // FIXME: This should be added to all clients, not just cassandra (cassandra needs ALLOW FILTERING to do filtering because of performance)
            //  { allowFilter: this.isCassandra }
            //);

            this.hasNextPage = response.result.length > this.limit

            if (this.hasNextPage) {
              response.result.pop()
            }
            this.data = response.result

            if (_.xor(response.fields, this.table.columns.map(c => c.columnName)).length > 0) {
              log.debug('table has changed, updating')
              await this.$store.dispatch('updateTableColumns', this.table)
            }

            const r = response.result;
            this.response = response

            if (!usesOffsetPagination && response.pageState && !this.paginationStates.includes(response.pageState)) {
              this.paginationStates = [...this.paginationStates, response.pageState]
            }

            this.resetPendingChanges()
            this.clearQueryError()

            // fill internal index column with primary keys
            r.forEach(row => {
              const primaryValues = this.primaryKeys.map(key => row[key]);
              row[this.internalIndexColumn] = primaryValues.join(",");
            });

            const data = this.dataToTableData({ rows: r }, this.tableColumns, offset);
            this.data = Object.freeze(data)
            this.lastUpdated = Date.now()
            this.preLoadScrollPosition = this.tableHolder.scrollLeft
            this.columnWidths = this.tabulator.getColumns().map((c) => {
              return { field: c.getField(), width: c.getWidth()}
            })
            await this.getTableKeys();
            resolve({
              last_page: 1,
              data
            });
          } catch (error) {
            console.error("data fetch error", error)
            this.queryError = {
              title: error.message,
              message: error.message
            }
            this.$nextTick(() => {
              this.tabulator.clearData()
            })
            reject(error.message);
          } finally {
            if (!this.active) {
              this.forceRedraw = true
            }
          }
        })();
      });
      return result;
    },
    setlastUpdatedText() {
      if (!this.lastUpdated) return null
      this.lastUpdatedText = this.timeAgo.format(this.lastUpdated)
    },
    setQueryError(title, message) {
      this.queryError = {
        title: title,
        message: message
      }
    },
    clearQueryError() {
      this.queryError = null
    },
    async jumpToLastPage() {
      try {
        const totalRows = await this.connection.getTableLength(this.table.name, this.table.schema); // -> SELECT (*) FROM table

        const lastPage = Math.ceil(totalRows / this.limit);

        this.page = lastPage;

      } catch (error) {
        console.error("Error jumping to the last page:", error);
      }
    },
    async getTableKeys() {
      this.rawTableKeys = await this.connection.getTableKeys(this.table.name, this.table.schema);
      const rawPrimaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema);
      this.primaryKeys = rawPrimaryKeys.map((key) => key.columnName);
    },
    async refreshTable() {
      if (!this.tabulator) return;

      log.debug('refreshing table')
      const page = this.tabulator.getPage()
      await this.tabulator.replaceData()
      await this.tabulator.setColumns(this.tableColumns)
      this.tabulator.setPage(page)
      if (!this.active) this.forceRedraw = true
    },
    positionRowOf(row: RowComponent) {
      return (this.limit * (this.page - 1)) + (row.getPosition() || 0)
    },
    updateJsonViewer(options: { range?: RangeComponent } = {}) {
      const range = options.range ?? this.tabulator.getRanges()[0]
      const row = range.getRows()[0]
      if (!row) {
        this.selectedRow = null
        this.selectedRowPosition = null
        this.selectedRowData = {}
        return
      }
      const position = this.positionRowOf(row)
      const data = row.getData("withForeignData")
      const cachedExpandablePaths = row.getExpandablePaths()
      this.selectedRow = row

      // Clean the data first
      let cleanedData = this.$bks.cleanData(data, this.tableColumns)

      this.selectedRowPosition = position
      this.selectedRowIndex = this.primaryKeys?.map((key: string) => data[key]).join(',');
      this.selectedRowData = parseRowDataForJsonViewer(cleanedData, this.tableColumns)
      this.expandablePaths = this.rawTableKeys
        .filter((key) => !row.hasForeignData([key.fromColumn]))
        .map((key) => ({
          path: [key.fromColumn],
          tableKey: key,
        }))
      this.expandablePaths.push(...cachedExpandablePaths)
      this.updateJsonViewerSidebar()
    },
    updateJsonViewerSidebar() {
      const updatedData: UpdateOptions = {
        dataId: this.selectedRowIndex,
        value: this.selectedRowData,
        expandablePaths: this.expandablePaths,
        signs: this.selectedRowDataSigns,
        editablePaths: this.editablePaths,
      }

      this.trigger(AppEvent.updateJsonViewerSidebar, updatedData)
    },
    exportTable() {
      this.trigger(AppEvent.beginExport, { table: this.table })
    },
    exportFiltered() {
      this.trigger(AppEvent.beginExport, {table: this.table, filters: this.filters} )
    },
    modifyRowData(data) {
      if (_.isArray(data)) {
        return data.map((item) => this.modifyRowData(item))
      }
      const output = {};
      const keys = Object.keys(data);

      for(const key of keys) {
        // skip internal columns
        if(key.startsWith(this.internalColumnPrefix)) continue;
        if(key.endsWith('--bks')) continue

        output[key] = data[key];
      }

      return output;
    },
    applyColumnChanges(columns) {
      if (!this.tabulator) return;

      this.tabulator.blockRedraw();

      columns.forEach(({name, filter}) => {
        if(filter) this.tabulator.showColumn(name)
        else this.tabulator.hideColumn(name)
      })

      this.tabulator.restoreRedraw();

      this.tabulator.redraw(true)
    },
    hideColumnByField(field: string) {
      this.tabulator.blockRedraw();
      this.tabulator.hideColumn(field);
      this.tabulator.restoreRedraw();
      this.tabulator.redraw(true)
    },
    forceFilter() {
      this.discardChanges();
      this.triggerFilter(draftFilters);
      this.$modal.hide(`discard-changes-modal-${this.tab.id}`);
    },
    focusingTable() {
      const classes = [...document.activeElement.classList.values()]
      return classes.some(c => c.startsWith('tabulator'))
    },
    handleRowFilterBuilderInput(filters: TableFilter[]) {
      setFilters(this.tab, filters)
      this.debouncedSaveTab(this.tab)
    },
    // FIXME rename to expandForeignKeys (with s at the end), and it should be able
    // to fetch multiple paths
    async expandForeignKey(expandablePath: ExpandablePath) {
      const { path, tableKey } = expandablePath
      try {
        const table = await this.connection.selectTop(
          tableKey.toTable,
          0,
          1,
          [],
          [{
            field: tableKey.toColumn,
            type: '=',
            value: _.get(this.selectedRowData, path),
          }],
          tableKey.toSchema,
          ['*']
        )

        if (table.result.length > 0) {
          _.set(this.selectedRowData, path, table.result[0])
          this.selectedRow.setForeignData(path, table.result[0])

          // Add new expandable paths for the new table
          const tableKeys = await this.connection.getTableKeys(tableKey.toTable, tableKey.toSchema)
          const expandablePaths = tableKeys.map((key: TableKey) => ({
            path: [...path, key.fromColumn],
            tableKey: key,
          }))
          this.expandablePaths.push(...expandablePaths)
          this.selectedRow.pushExpandablePaths(...expandablePaths)
        }
      } catch (e) {
        log.error(e)
      }

      // Remove the path from the list of expandable paths
      const filteredExpandablePaths = this.expandablePaths.filter((p) => p !== expandablePath)
      this.expandablePaths = filteredExpandablePaths
      this.selectedRow.setExpandablePaths((expandablePaths: ExpandablePath[]) => expandablePaths.filter((p) => p !== expandablePath))

      this.updateJsonViewerSidebar()
    },
    handleRangeChange(ranges: RangeComponent[]) {
      this.updateJsonViewer({ range: ranges[0] })
    },
    handleSwitchedTab(tab) {
      if (tab === this.tab) {
        this.handleTabActive()
      } else {
        this.handleTabInactive()
      }
    },
    handleTabActive() {
      this.updateJsonViewerSidebar()
      this.registerHandlers([
        {
          event: AppEvent.jsonViewerSidebarExpandPath,
          handler: this.expandForeignKey,
        },
        {
          event: AppEvent.jsonViewerSidebarValueChange,
          handler: this.handleJsonValueChange,
        },
      ])
    },
    handleTabInactive() {
      this.unregisterHandlers([
        {
          event: AppEvent.jsonViewerSidebarExpandPath,
          handler: this.expandForeignKey,
        },
        {
          event: AppEvent.jsonViewerSidebarValueChange,
          handler: this.handleJsonValueChange,
        },
      ])
    },
    handleJsonValueChange({key, value}) {
      // this is just a safeguard, we shouldn't hit it but if we do it can save us from catastrophe
      if (!this.editable) return;

      const column = this.table.columns.find((c) => c.columnName === key);
      if (column) {
        const isJsonColumn = String(column.dataType).toUpperCase() === 'JSON' || String(column.dataType).toUpperCase() === 'JSONB'

        if (isJsonColumn && _.isObject(value)) {
          value = JSON.stringify(value)
        }
      }
      this.selectedRow?.getCell(key).setValue(value)
    },
    debouncedSaveTab: _.debounce(function(tab) {
      this.$store.dispatch('tabs/save', tab)
    }, 300),
  }
});
</script>
