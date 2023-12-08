<template>
  <div
    v-hotkey="keymap"
    class="tabletable flex-col"
    :class="{'view-only': !editable}"
  >
    <template v-if="!table && initialized">
      <div class="no-content" />
    </template>
    <template v-else>
      <row-filter-builder
        v-if="table.columns?.length"
        :columns="table.columns"
        :initial-filters="initialFilters"
        @input="handleRowFilterBuilderInput"
        @submit="triggerFilter"
      />
      <div ref="table" />
      <ColumnFilterModal
        :modal-name="columnFilterModalName"
        :columns-with-filter-and-order="columnsWithFilterAndOrder"
        :has-pending-changes="pendingChangesCount > 0"
        @changed="applyColumnChanges"
      />
    </template>

    <statusbar :mode="statusbarMode">
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
          :table="table"
          :connection="connection"
        />
        <a
          @click="refreshTable"
          tabindex="0"
          role="button"
          class="statusbar-item hoverable"
          v-if="lastUpdatedText && !error"
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
      <div class="tabulator-paginator">
        <div class="flex-center flex-middle flex">
          <a
            @click="page = page - 1"
            v-tooltip="ctrlOrCmd('left')"
          ><i class="material-icons">navigate_before</i></a>
          <input
            type="number"
            v-model="page"
          >
          <a
            @click="page = page + 1"
            v-tooltip="ctrlOrCmd('right')"
          ><i class="material-icons">navigate_next</i></a>
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
              >{{ pendingChangesCount }}</span>
              <span>Apply</span>
            </x-button>
            <x-button
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
          v-tooltip="`${ctrlOrCmd('r')} or F5`"
          class="btn btn-flat"
          title="Refresh table"
          @click="refreshTable"
        >
          <i class="material-icons">refresh</i>
        </x-button>
        <x-button
          class="btn btn-flat"
          v-tooltip="ctrlOrCmd('n')"
          title="Add row"
          @click.prevent="cellAddRow"
        >
          <i class="material-icons">add</i>
        </x-button>
        <x-button
          class="actions-btn btn btn-flat"
          title="actions"
        >
          <i class="material-icons">settings</i>
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <x-menuitem @click="exportTable">
              <x-label>Export whole table</x-label>
            </x-menuitem>

            <x-menuitem @click="exportFiltered">
              <x-label>Export filtered view</x-label>
            </x-menuitem>
            <x-menuitem @click="showColumnFilterModal">
              <x-label>Show or hide columns</x-label>
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
        <div class="dialog-content">
          <div class="dialog-c-title">
            Confirmation
          </div>
          <div class="modal-form">
            Sorting or Filtering now will discard {{ pendingChangesCount }} pending change(s). Are you sure?
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
      </modal>
    </portal>
  </div>
</template>

<style>
.item-notice > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<script lang="ts">
import Vue from 'vue'
import pluralize from 'pluralize'
import { Tabulator, TabulatorFull } from 'tabulator-tables'
import data_converter from "../../mixins/data_converter";
import DataMutators, { escapeHtml } from '../../mixins/data_mutators'
import { FkLinkMixin } from '@/mixins/fk_click'
import Statusbar from '../common/StatusBar.vue'
import RowFilterBuilder from './RowFilterBuilder.vue'
import ColumnFilterModal from './ColumnFilterModal.vue'
import rawLog from 'electron-log'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
import globals from '@/common/globals';
import {AppEvent} from '../../common/AppEvent';
import { vueEditor } from '@shared/lib/tabulator/helpers';
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue';
import TableLength from '@/components/common/TableLength.vue'
import { mapGetters, mapState } from 'vuex';
import { TableUpdate, TableUpdateResult } from '@/lib/db/models';
import { dialectFor, FormatterDialect } from '@shared/lib/dialects/models'
import { format } from 'sql-formatter';
import { normalizeFilters, safeSqlFormat } from '@/common/utils'
import { TableFilter } from '@/lib/db/models';
import { copyRange, copyActionsMenu, commonColumnMenu, createMenuItem } from '@/lib/menu/tableMenu';
const log = rawLog.scope('TableTable')

let draftFilters: TableFilter[] | string | null;

export default Vue.extend({
  components: { Statusbar, ColumnFilterModal, TableLength, RowFilterBuilder },
  mixins: [data_converter, DataMutators, FkLinkMixin],
  props: ["connection", "initialFilters", "active", 'tab', 'table'],
  data() {
    return {
      filters: [],
      headerFilter: true,
      columnsSet: false,
      tabulator: null,
      actualTableHeight: "100%",
      loading: false,

      // table data
      data: null, // array of data
      preLoadScrollPosition: null,
      columnWidths: null,
      //
      response: null,
      limit: 100,
      rawTableKeys: [],
      primaryKeys: null,
      pendingChanges: {
        inserts: [],
        updates: [],
        deletes: []
      },
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
    };
  },
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded', 'usedConfig', 'database', 'workspaceId']),
    ...mapGetters(['dialectData', 'dialect']),
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
      const result = {}
      result['f5'] = this.refreshTable.bind(this)
      result[this.ctrlOrCmd('right')] = () => {
        const focusingTable = this.tabulator.element.contains(document.activeElement)
        if (!focusingTable) this.page++
      }
      result[this.ctrlOrCmd('left')] = () => {
        const focusingTable = this.tabulator.element.contains(document.activeElement)
        if (!focusingTable) this.page++
      }
      result[this.ctrlOrCmd('r')] = this.refreshTable.bind(this)
      result[this.ctrlOrCmd('n')] = this.cellAddRow.bind(this)
      result[this.ctrlOrCmd('s')] = this.saveChanges.bind(this)
      result[this.ctrlOrCmd('shift+s')] = this.copyToSql.bind(this)
      result[this.ctrlOrCmd('c')] = this.copySelection.bind(this)
      result[this.ctrlOrCmd('d')] = this.cloneSelection.bind(this)
      result['delete'] = this.deleteTableSelection.bind(this)
      return result
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
      return this.primaryKeys?.length &&
        this.table.entityType === 'table' &&
        !this.dialectData.disabledFeatures?.tableTable
    },
    readOnlyNotice() {
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
        if (!result[item.fromColumn]) result[item.fromColumn] = [];
        result[item.fromColumn].push(item);
      })
      return result
    },
    // we can use this to track if column names have been updated and we need
    // to refresh
    tableColumnNames() {
      return this.table?.columns?.map((c) => c.columnName).join("-") || []
    },
    tableColumns() {
      const results = []
      if (!this.table) return []

      const cellMenu = (keyDatas?: any[]) => {
        return (_, cell: Tabulator.CellComponent) => {
          const range = cell.getRange()
          const menu = [
            this.setAsNullMenuItem(range),
            { separator: true },
            ...copyActionsMenu({
              range,
              connection: this.connection,
              table: this.table.name,
              schema: this.table.schema,
            }),
            { separator: true },
            ...this.rowActionsMenu(range),
          ]

          if (keyDatas?.length > 0) {
            menu.push({ separator: true })
            keyDatas.forEach(keyData => {
              menu.push({
                label: createMenuItem(`Go to ${keyData.toTable} (${keyData.toColumn})`),
                action: (e, cell) => this.fkClick(keyData, cell)
              })
            })
          }

          return menu
        }
      }

      const columnMenu = (_, column: Tabulator.ColumnComponent) => {
        const range = column.getRange()
        return [
          this.setAsNullMenuItem(range),
          { separator: true },
          ...copyActionsMenu({
            range,
            connection: this.connection,
            table: this.table.name,
            schema: this.table.schema,
          }),
          { separator: true },
          ...commonColumnMenu,
          {
            label: createMenuItem("Open Column Filter"),
            action: this.showColumnFilterModal
          },
        ]
      }

      // 1. add a column for a real column
      // if a FK, add another column with the link
      // to the FK table.
      this.table.columns.forEach(column => {

        const keyDatas: any[] = Object.entries(this.tableKeys).filter((entry) => entry[0].includes(column.columnName));
        // this needs fixing
        // currently it doesn't fetch the right result if you update the PK
        // because it uses the PK to fetch the result.
        const slimDataType = this.slimDataType(column.dataType)
        const editorType = this.editorType(column.dataType)
        const useVerticalNavigation = editorType === 'textarea'
        const isPK = this.primaryKeys?.length && this.isPrimaryKey(column.columnName)
        const columnWidth = this.table.columns.length > 30 ?
          this.defaultColumnWidth(slimDataType, globals.bigTableColumnWidth) :
          undefined;
        const hasKeyDatas = keyDatas && keyDatas.length > 0

        let headerTooltip = `${column.columnName} ${column.dataType}`
        if (hasKeyDatas) {
          const keyData = keyDatas[0][1];
          if (keyData.length === 1)
            headerTooltip += ` -> ${keyData[0].toTable}(${keyData[0].toColumn})`
          else
            headerTooltip += ` -> ${keyData.map(item => `${item.toTable}(${item.toColumn})`).join(', ').replace(/, (?![\s\S]*, )/, ', or ')}`
        } else if (isPK) {
          headerTooltip += ' [Primary Key]'
        }

        let cssClass: string;
        if (isPK) {
          cssClass = 'primary-key';
        } else if (hasKeyDatas) {
          cssClass = 'foreign-key';
        }

        // if column has a comment, add it to the tooltip
        if (column.comment) {
          headerTooltip += `<br/> ${escapeHtml(column.comment)}`
        }

        const result = {
          title: column.columnName,
          field: column.columnName,
          titleFormatter: this.headerFormatter,
          titleFormatterParams: {
            columnName: column.columnName,
            dataType: column.dataType
          },
          mutatorData: this.resolveTabulatorMutator(column.dataType, dialectFor(this.connection.connectionType)),
          dataType: column.dataType,
          minWidth: globals.minColumnWidth,
          width: columnWidth,
          maxWidth: globals.maxColumnWidth,
          maxInitialWidth: globals.maxInitialWidth,
          cssClass,
          editable: this.cellEditCheck,
          headerSort: true,
          editor: editorType,
          tooltip: this.cellTooltip,
          contextMenu: cellMenu(hasKeyDatas ? keyDatas[0][1] : undefined),
          headerContextMenu: columnMenu,
          headerMenu: columnMenu,
          headerTooltip: headerTooltip,
          cellEditCancelled: (cell) => cell.getRow().normalizeHeight(),
          formatter: this.cellFormatter,
          formatterParams: {
            fk: hasKeyDatas && keyDatas[0][1],
            fkOnClick: hasKeyDatas && ((e, cell) => this.fkClick(keyDatas[0][1][0], cell)),
          },
          editorParams: {
            verticalNavigation: useVerticalNavigation ? 'editor' : undefined,
            search: true,
            allowEmpty: true,
            preserveObject: column.dataType.startsWith('_'),
            onPreserveObjectFail: (value: unknown) => {
              log.error('Failed to preserve object for', value)
              return true
            },
            // elementAttributes: {
            //   maxLength: column.columnLength // TODO
            // }
          },
        }

        if (/^(bool|boolean)$/i.test(column.dataType)) {
          const trueVal = this.dialectData.boolean?.true ?? true
          const falseVal = this.dialectData.boolean?.false ?? false
          const values = [falseVal, trueVal]
          if (column.nullable) values.push({ label: '(NULL)', value: null })
          result.editorParams['values'] = values
        }

        results.push(result)
      });

      // add internal index column
      const result = {
        title: this.internalIndexColumn,
        field: this.internalIndexColumn,
        maxWidth: globals.maxColumnWidth,
        maxInitialWidth: globals.maxInitialWidth,
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
    persistenceOptions() {
      // return {}
      if (!this.tableId) return {}

      return {
        persistence: {
          sort: false,
          filter: false,
          group: false,
          columns: ['visible', 'width'],

        },
        persistenceMode: 'local',
        persistenceID: this.tableId,
      }
    },
    initialSort() {
      // FIXME: Don't specify an initial sort order
      // because it can slow down some databases.
      // However - some databases require an 'order by' for limit, so needs some
      // integration tests first.
      if (!this.table?.columns?.length) {
        return [];
      }

      return [{ column: this.table.columns[0].columnName, dir: "asc" }];
    },
    shouldInitialize() {
      return this.tablesInitialLoaded && this.active && !this.initialized
    },
    columnFilterModalName() {
      return `column-filter-modal-${this.tab.id}`
    },
  },

  watch: {
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
          this.$nextTick(() => this.tabulator.redraw())
        }
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
      if (this.primaryKeys?.length && primaryFilter) {
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
    }
  },
  beforeDestroy() {
    if(this.interval) clearInterval(this.interval)
    if (this.tabulator) {
      this.tabulator.destroy()
    }
  },
  async mounted() {
    if (this.shouldInitialize) {
      this.$nextTick(async() => {
        await this.initialize()
      })
    }
  },
  methods: {
    copySelection() {
      if (!document.activeElement.classList.contains('tabulator-tableholder')) return
      copyRange({ range: this.tabulator.getActiveRange(), type: 'tsv' })
    },
    deleteTableSelection(_: Event, range?: Tabulator.RangeComponent) {
      if (!document.activeElement.classList.contains('tabulator-tableholder')) return
      if (!range) range = this.tabulator.getActiveRange()
      this.addRowsToPendingDeletes(range.getRows());
    },
    getCleanSelectedRowData(cell) {
      const selectedRows = this.tabulator.getSelectedRows()
      const rowData = selectedRows?.length ? selectedRows : [cell.getRow()]
      const clean = rowData.map((row) => {
        const m = this.modifyRowData(row.getData())
        return this.$bks.cleanData(m, this.tableColumns)
      })
      return clean;
    },
    headerFormatter(_cell, formatterParams) {
      const { columnName, dataType } = formatterParams
      return `
        <span class="title">
          ${escapeHtml(columnName)}
          <span class="badge">${dataType}</span>
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
      return this.primaryKeys.includes(column);
    },
    async initialize() {
      this.initialized = true
      this.resetPendingChanges()
      await this.$store.dispatch('updateTableColumns', this.table)
      this.rawTableKeys = await this.connection.getTableKeys(this.table.name, this.table.schema)
      const rawPrimaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema);
      this.primaryKeys = rawPrimaryKeys.map((key) => key.columnName);
      this.filters = normalizeFilters(this.initialFilters || [])

      this.tabulator = new TabulatorFull(this.$refs.table, {
        spreadsheet: true,
        height: this.actualTableHeight,
        columns: this.tableColumns,
        nestedFieldSeparator: false,
        placeholder: "No Data",
        renderHorizontal: 'virtual',
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
        ...this.persistenceOptions,

        // callbacks
        ajaxRequestFunc: this.dataFetch,
        index: this.internalIndexColumn,
        keybindings: {
          scrollToEnd: false,
          scrollToStart: false,
          scrollPageUp: false,
          scrollPageDown: false
        },
        spreadsheetRowHeader: {
          contextMenu: (_, cell: Tabulator.CellComponent) => {
            const range = cell.getRange()
            return [
              this.setAsNullMenuItem(range),
              { separator: true },
              ...copyActionsMenu({
                range,
                connection: this.connection,
                table: this.table.name,
                schema: this.table.schema,
              }),
              { separator: true },
              ...this.rowActionsMenu(range),
            ]
          },
          headerContextMenu: (_, column: Tabulator.ColumnComponent) => {
            const range = column.getRange()
            return [
              this.setAsNullMenuItem(range),
              { separator: true },
              ...copyActionsMenu({
                range,
                connection: this.connection,
                table: this.table.name,
                schema: this.table.schema,
              }),
              { separator: true },
              ...commonColumnMenu,
              {
                label: createMenuItem("Open Column Filter"),
                action: this.showColumnFilterModal,
              },
            ]
          }
        },
      });
      this.tabulator.on('cellEdited', this.cellEdited)
      this.tabulator.on('dataProcessed', this.maybeScrollAndSetWidths)

      this.$nextTick(() => {
        if (this.$refs.valueInput) {
          this.$refs.valueInput.focus()
        }
      })
    },
    rowActionsMenu(range: Tabulator.RangeComponent) {
      const rowRangeLabel = `${range.getTop() + 1} - ${range.getBottom() + 1}`
      return [
        {
          label:
            range.getTop() === range.getBottom()
              ? createMenuItem("Clone row")
              : createMenuItem(`Clone rows ${rowRangeLabel}`),
          action: this.cellCloneRow.bind(this),
          disabled: !this.editable,
        },
        {
          label:
            range.getTop() === range.getBottom()
              ? createMenuItem("Delete row", "Delete")
              : createMenuItem(`Delete rows ${rowRangeLabel}`, "Delete"),
          action: () => {
            this.tabulator.rowManager.element.focus()
            this.deleteTableSelection(undefined, range)
          },
          disabled: !this.editable,
        },
      ]
    },
    setAsNullMenuItem(range: Tabulator.RangeComponent) {
      return {
        label: createMenuItem("Set as NULL"),
        action: () => range.getCells().map((cell) => {
          if (!this.isPrimaryKey(cell.getField())) cell.setValue(null);
        }),
        disabled: !this.editable,
      }
    },
    openProperties() {
      this.$root.$emit(AppEvent.openTableProperties, { table: this.table })
    },
    buildPendingInserts() {
      if (!this.table) return
      const inserts = this.pendingChanges.inserts.map((item) => {
        const columnNames = this.table.columns.map((c) => c.columnName)
        const rowData = item.row.getData()
        const result = {}
        columnNames.forEach((c) => {
          const d = rowData[c]
          if (this.isPrimaryKey(c) && !d) {
            // do nothing
          } else {
            result[c] = d
          }
        })
        return {
          table: this.table.name,
          schema: this.table.schema,
          dataset: this.database,
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
      const chunkyTypes = ['json', 'jsonb', 'blob', 'text', '_text', 'tsvector']
      if (chunkyTypes.includes(slimType)) return globals.largeFieldWidth
      return defaultValue
    },
    // TODO: this is not attached to anything. but it might be needed?
    allowHeaderSort(column) {
      if(!column.dataType) return true
      if(column.dataType.startsWith('json')) return false
      return true
    },
    slimDataType(dt) {
      if (!dt) return null
      if(dt === 'bit(1)') return dt
      return dt.split("(")[0]
    },
    editorType(dt) {
      const ne = vueEditor(NullableInputEditorVue)
      switch (dt?.toLowerCase() ?? '') {
        case 'text':
        case 'json':
        case 'jsonb':
        case 'bytea':
        case 'tsvector':
          return 'textarea'
        case 'bool':
        case 'boolean':
          return 'select'
        default: return ne
      }
    },
    cellEditCheck(cell: Tabulator.CellComponent) {
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

      return this.editable && !this.isPrimaryKey(cell.getField()) && !pendingDelete
    },
    insertionCellCheck(cell: Tabulator.CellComponent) {
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

      if (currentEdit?.oldValue == cell.getValue()) {
        this.$set(this.pendingChanges, 'updates', _.without(this.pendingChanges.updates, currentEdit))
        cell.getElement().classList.remove('edited')
        return
      }

      const primaryKeys = pkCells.map((cell) => {
        return {
          column: cell.getField(),
          value: cell.getValue()
        }
      })
      if (currentEdit) {
        currentEdit.value = cell.getValue()
      } else {
        const payload: TableUpdate & { key: string, oldValue: any, cell: any } = {
          key: key,
          table: this.table.name,
          schema: this.table.schema,
          column: cell.getField(),
          columnType: column ? column.dataType : undefined,
          primaryKeys,
          oldValue: cell.getOldValue(),
          cell: cell,
          value: cell.getValue(0)
        }
        // remove existing pending updates with identical pKey-column combo
        let pendingUpdates = _.reject(this.pendingChanges.updates, { 'key': payload.key })
        pendingUpdates.push(payload)
        this.$set(this.pendingChanges, 'updates', pendingUpdates)
      }
    },
    cloneSelection(range?: Tabulator.RangeComponent) {
      if (!range) range = this.tabulator.getActiveRange()

      range.getRows().forEach((row) => {
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
    cellCloneRow(_, cell: Tabulator.CellComponent) {
      this.cloneSelection(cell.getRange())
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
    addRowsToPendingDeletes(rows: Tabulator.RowComponent[]) {
      if (!this.primaryKeys) {
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
          primaryKeys.push({
            column: cell.getField(),
            value: isBinary ? Buffer.from(cell.getValue(), 'hex') : cell.getValue()
          })
        })

        const matchingPrimaryKeys =  (update) => _.isEqual(update.primaryKeys, payload.primaryKeys)

        const filteredUpdates = _.filter(this.pendingChanges.updates, matchingPrimaryKeys)
        discardedUpdates.push(...filteredUpdates)

        const payload = {
          table: this.table.name,
          row,
          schema: this.table.schema,
          primaryKeys,
        }

        payloads.push(payload)

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
          updates: this.pendingChanges.updates,
          deletes: this.pendingChanges.deletes
        }
        const sql = this.connection.applyChangesSql(changes)
        const formatted = format(sql, { language: FormatterDialect(this.dialect) })
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
            updates: this.pendingChanges.updates,
            deletes: this.pendingChanges.deletes
          }

          const result = await this.connection.applyChanges(payload)
          const updateIncludedPK = this.pendingChanges.updates.find(e => e.column === e.pkColumn)

          if (updateIncludedPK || this.hasPendingInserts || this.hasPendingDeletes) {
            replaceData = true
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
            const niceChanges = pluralize('change', this.pendingChangesCount, true)
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
          if (!this.active) {
            this.forceRedraw = true
          }
        }
    },
    discardChanges() {
      this.saveError = null

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
        const language = FormatterDialect(this.dialect);
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
      this.tabulator?.setData()
    },
    dataFetch(_url, _config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      log.info("fetch params", params)
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
      let filters = this.filters

      if (params.sort) {
        orderBy = params.sort
      }

      if (params.size) {
        limit = params.size
      }

      if (params.page) {
        offset = (params.page - 1) * limit;
      }

      // like if you change a filter
      if (params.page && params.page !== this.page) {
        this.page = params.page
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
              limit,
              orderBy,
              filters,
              this.table.schema,
              selects,
            );

            if (_.xor(response.fields, this.table.columns.map(c => c.columnName)).length > 0) {
              log.debug('table has changed, updating')
              await this.$store.dispatch('updateTableColumns', this.table)
            }

            const r = response.result;
            this.response = response
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
            resolve({
              last_page: 1,
              data
            });
          } catch (error) {
            reject(error.message);
            this.queryError = {
              title: error.message,
              message: error.message
            }
            this.$nextTick(() => {
              this.tabulator.clearData()
            })
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
    async refreshTable() {
      if (!this.tabulator) return;

      log.debug('refreshing table')
      const page = this.tabulator.getPage()
      await this.tabulator.replaceData()
      this.tabulator.setPage(page)
      if (!this.active) this.forceRedraw = true
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
    forceFilter() {
      this.discardChanges();
      this.triggerFilter(draftFilters);
      this.$modal.hide(`discard-changes-modal-${this.tab.id}`);
    },
    handleRowFilterBuilderInput(filters: TableFilter[]) {
      this.tab.setFilters(filters)
      this.debouncedSaveTab(this.tab)
    },
    debouncedSaveTab: _.debounce(function(tab) {
      this.$store.dispatch('tabs/save', tab)
    }, 300),
  }
});
</script>
