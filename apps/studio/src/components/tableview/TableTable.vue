<template>
  <div v-hotkey="keymap" class="tabletable flex-col" :class="{'view-only': !editable}">
    <template v-if="!table && initialized">
      <div class="no-content">

      </div>
    </template>
    <template v-else >
      <div class="table-filter">
        <form @submit.prevent="triggerFilter">
          <div v-if="filterMode === 'raw'" class="filter-group row gutter">
            <div class="btn-wrap">
              <button class="btn btn-flat btn-fab" type="button" @click.stop="changeFilterMode('builder')" title="Toggle Filter Type">
                <i class="material-icons-outlined">filter_alt</i>
              </button>
            </div>
            <div class="expand filter">
              <div class="filter-wrap">
                <input
                  class="form-control"
                  type="text"
                  v-model="filterRaw"
                  ref="valueInput"
                  :placeholder=filterPlaceholder
                />
                <button
                  type="button"
                  class="clear btn-link"
                  @click.prevent="filterRaw = ''"
                >
                  <i class="material-icons">cancel</i>
                </button>
              </div>
            </div>
            <div class="btn-wrap">
              <button class="btn btn-primary btn-fab" type="submit" title="Filter">
                <i class="material-icons">search</i>
              </button>
            </div>
          </div>
          <div v-else-if="filterMode === 'builder'" class="filter-group row gutter">
            <div class="btn-wrap">
              <button class="btn btn-flat btn-fab" type="button" @click.stop="changeFilterMode('raw')" title="Toggle Filter Type">
                <i class="material-icons">code</i>
              </button>
            </div>
            <div>
              <div class="select-wrap" >
                <select name="Filter Field" class="form-control" v-model="filter.field">
                  <option
                    v-for="column in table.columns"
                    v-bind:key="column.columnName"
                    :value="column.columnName"
                  >{{column.columnName}}</option>
                </select>
              </div>
            </div>
            <div>
              <div class="select-wrap">
                <select name="Filter Type" class="form-control" v-model="filter.type">
                  <option v-for="(v, k) in filterTypes" v-bind:key="k" :value="v">{{k}}</option>
                </select>
              </div>
            </div>
            <div class="expand filter">
              <div class="filter-wrap">
                <input
                  class="form-control"
                  type="text"
                  v-model="filter.value"
                  placeholder="Enter Value"
                  ref="valueInput"
                />
                <button
                  type="button"
                  class="clear btn-link"
                  @click.prevent="filter.value = ''"
                >
                  <i class="material-icons">cancel</i>
                </button>
              </div>
            </div>
            <div class="btn-wrap">
              <button class="btn btn-primary btn-fab" type="submit" title="Filter">
                <i class="material-icons">search</i>
              </button>
            </div>
          </div>
        </form>
      </div>
      <div ref="table"></div>
    </template>

    <statusbar :mode="statusbarMode">


      <div class="truncate statusbar-info">
        <x-button @click.prevent="openProperties" class="btn btn-flat btn-icon end" title="View Structure">
          Structure <i class="material-icons">north_east</i>
        </x-button>
        <!-- Info -->
        <span class="statusbar-item" :title="loadingLength ? 'Loading Total Records' : `Approximately ${totalRecordsText} Records`">
          <i class="material-icons">list_alt</i>
          <span v-if="loadingLength">Loading...</span>
          <span v-else>{{ totalRecordsText }}</span>
        </span>
        <a @click="refreshTable" tabindex="0" role="button" class="statusbar-item hoverable" v-if="lastUpdatedText && !error" :title="'Updated' + ' ' + lastUpdatedText">
          <i class="material-icons">update</i>
          <span>{{lastUpdatedText}}</span>
        </a>
        <span v-if="error" class="statusbar-item error" :title="error.message">
          <i class="material-icons">error_outline</i>
          <span class="">{{ error.title }}</span>
        </span>
      </div>

      <!-- Pagination -->
      <div class="tabulator-paginator">
        <div class="flex-center flex-middle flex">
          <a @click="page = page  - 1" v-tooltip="ctrlOrCmd('left')"><i class="material-icons">navigate_before</i></a>
          <input type="number" v-model="page" />
          <a @click="page = page + 1" v-tooltip="ctrlOrCmd('right')"><i class="material-icons">navigate_next</i></a>
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
          <x-button class="btn btn-flat" @click.prevent="discardChanges">Reset</x-button>
          <x-button class="btn btn-primary btn-badge btn-icon" @click.prevent="saveChanges" :title="saveButtonText" :class="{'error': !!saveError}">
            <i v-if="error" class="material-icons ">error_outline</i>
            <span class="badge" v-if="!error">{{pendingChangesCount}}</span>
            <span>Apply</span>
          </x-button>
        </template>
        <template v-if="!editable">
          <span class="statusbar-item" :title="readOnlyNotice"><i class="material-icons-outlined">info</i> Read Only</span>
        </template>

        <!-- Actions -->
        <x-button v-tooltip="`${ctrlOrCmd('r')} or F5`" class="btn btn-flat" title="Refresh table" @click="refreshTable">
          <i class="material-icons">refresh</i>
        </x-button>
        <x-button class="btn btn-flat" v-tooltip="ctrlOrCmd('n')" title="Add row" @click.prevent="cellAddRow">
          <i class="material-icons">add</i>
        </x-button>
        <x-button class="actions-btn btn btn-flat" title="actions">
          <i class="material-icons">settings</i>
          <i class="material-icons">arrow_drop_down</i>
          <x-menu>
            <x-menuitem @click="exportTable">
              <x-label>Export Whole Table</x-label>
            </x-menuitem>

            <x-menuitem @click="exportFiltered">
              <x-label>Export Filtered View</x-label>
            </x-menuitem>
          </x-menu>
        </x-button>

      </div>

    </statusbar>
  </div>
</template>

<style>
.loading-overlay {
  position: absolute;
  right: 50%;
  top: 200px;
}
</style>

<script lang="ts">
import Vue from 'vue'
import Papa from 'papaparse'
import pluralize from 'pluralize'
import { TabulatorFull } from 'tabulator-tables'
// import pluralize from 'pluralize'
import data_converter from "../../mixins/data_converter";
import DataMutators, { escapeHtml } from '../../mixins/data_mutators'
import Statusbar from '../common/StatusBar.vue'
import rawLog from 'electron-log'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
import globals from '@/common/globals';
import {AppEvent} from '../../common/AppEvent';
import { vueEditor } from '@shared/lib/tabulator/helpers';
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue';
import { mapGetters, mapState } from 'vuex';
import { Tabulator } from 'tabulator-tables'
import { TableUpdate } from '@/lib/db/models';
const log = rawLog.scope('TableTable')
const FILTER_MODE_BUILDER = 'builder'
const FILTER_MODE_RAW = 'raw'

export default Vue.extend({
  components: { Statusbar },
  mixins: [data_converter, DataMutators],
  props: ["connection", "initialFilter", "active", 'tab', 'table'],
  data() {
    return {
      filterTypes: {
        equals: "=",
        "does not equal": "!=",
        like: "like",
        "less than": "<",
        "less than or equal": "<=",
        "greater than": ">",
        "greater than or equal": ">="
      },
      filter: {
        value: null,
        type: "=",
        field: null
      },
      filterRaw: null,
      filterMode: FILTER_MODE_BUILDER,
      headerFilter: true,
      columnsSet: false,
      tabulator: null,
      actualTableHeight: "100%",
      loading: false,

      // table data
      data: null, // array of data
      totalRecords: null,
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
      // @ts-ignore
      interval: setInterval(this.setlastUpdatedText, 10000),

      forceRedraw: false,
      rawPage: 1,
      initialized: false,
      internalColumnPrefix: "__beekeeper_internal_",
      internalIndexColumn: "__beekeeper_internal_index",
      selectedCell: null,
    };
  },
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded']),
    ...mapGetters(['dialectData']),
    loadingLength() {
      return this.totalRecords === null
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
      result[this.ctrlOrCmd('right')] = () => this.page = this.page + 1
      result[this.ctrlOrCmd('left')] = () => this.page = this.page - 1
      result[this.ctrlOrCmd('r')] = this.refreshTable.bind(this)
      result[this.ctrlOrCmd('n')] = this.cellAddRow.bind(this)
      result[this.ctrlOrCmd('s')] = this.saveChanges.bind(this)
      result[this.ctrlOrCmd('f')] = () => this.$refs.valueInput.focus()
      result[this.ctrlOrCmd('c')] = this.copyCell
      return result
    },
    cellContextMenu() {
      return [{
          label: '<x-menuitem><x-label>Set Null</x-label></x-menuitem>',
          action: (_e, cell: Tabulator.CellComponent) => {
            if (this.isPrimaryKey(cell.getField())) {
              // do nothing
            } else {
              cell.setValue(null);
            }
          },
          disabled: !this.editable
        },
        { separator: true },
        {
          label: '<x-menuitem><x-label>Copy Cell</x-label></x-menuitem>',
          action: (_e, cell) => {
            this.$native.clipboard.writeText(cell.getValue());
          },
        },
        {
          label: '<x-menuitem><x-label>Copy Row (JSON)</x-label></x-menuitem>',
          action: (_e, cell) => {
            const data = this.modifyRowData(cell.getRow().getData())
            const fixed = this.$bks.cleanData(data, this.tableColumns)
            Object.keys(data).forEach((key) => {
              const v = data[key]
              const column = this.tableColumns.find((c) => c.field === key)
              const nuKey = column ? column.title : key
              fixed[nuKey] = v
            })
            this.$native.clipboard.writeText(JSON.stringify(fixed))
          }
        },
        {
          label: '<x-menuitem><x-label>Copy Row (TSV / Excel)</x-label></x-menuitem>',
          action: (_e, cell) => this.$native.clipboard.writeText(Papa.unparse([this.$bks.cleanData(this.modifyRowData(cell.getRow().getData()))], { header: false, delimiter: "\t", quotes: true, escapeFormulae: true }))
        },
        {
          label: '<x-menuitem><x-label>Copy Row (Insert)</x-label></x-menuitem>',
          action: async (_e, cell) => {

            const fixed = this.$bks.cleanData(this.modifyRowData(cell.getRow().getData()), this.tableColumns)

            const tableInsert = {
              table: this.table.name,
              schema: this.table.schema,
              data: [fixed],
            }
            const query = await this.connection.getInsertQuery(tableInsert)
            this.$native.clipboard.writeText(query)
          }
        },
        { separator: true },
        {
          label: '<x-menuitem><x-label>Clone Row</x-label></x-menuitem>',
          action: this.cellCloneRow.bind(this),
          disabled: !this.editable
        },
        {
          label: '<x-menuitem><x-label>Delete Row</x-label></x-menuitem>',
          action: (_e, cell) => this.addRowToPendingDeletes(cell.getRow()),
          disabled: !this.editable
        },
      ]
    },
    filterPlaceholder() {
      return `Enter condition, eg: name like 'Matthew%'`
    },
    totalRecordsText() {
      return `~${this.totalRecords.toLocaleString()}`
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
        "Only tables with a single primary key column are editable."
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
    tableColumns() {
      const keyWidth = 40
      const results = []
      if (!this.table) return []
      // 1. add a column for a real column
      // if a FK, add another column with the link
      // to the FK table.
      this.table.columns.forEach(column => {

        const keyDatas: any[] = this.tableKeys[column.columnName]

        // this needs fixing
        // currently it doesn't fetch the right result if you update the PK
        // because it uses the PK to fetch the result.
        const slimDataType = this.slimDataType(column.dataType)
        const editorType = this.editorType(column.dataType)
        const useVerticalNavigation = editorType === 'textarea'
        const isPK = this.primaryKeys?.length && this.isPrimaryKey(column.columnName)
        const columnWidth = this.table.columns.length > 30 ?
          this.defaultColumnWidth(slimDataType, globals.bigTableColumnWidth) :
          undefined

        const formatter = () => {
          return `<span class="tabletable-title">${escapeHtml(column.columnName)} <span class="badge">${escapeHtml(slimDataType)}</span></span>`
        }

        let headerTooltip = `${column.columnName} ${column.dataType}`
        if (keyDatas && keyDatas.length > 0) {
          if (keyDatas.length === 1)
            headerTooltip += ` -> ${keyDatas[0].toTable}(${keyDatas[0].toColumn})`
          else
            headerTooltip += ` -> ${keyDatas.map(item => `${item.toTable}(${item.toColumn})`).join(', ').replace(/, (?![\s\S]*, )/, ', or ')}`
        } else if (isPK) {
          headerTooltip += ' [Primary Key]'
        }

        const result = {
          title: column.columnName,
          field: column.columnName,
          titleFormatter: formatter,
          mutatorData: this.resolveTabulatorMutator(column.dataType),
          dataType: column.dataType,
          cellClick: this.cellClick,
          width: columnWidth,
          maxWidth: globals.maxColumnWidth,
          maxInitialWidth: globals.maxInitialWidth,
          cssClass: isPK ? 'primary-key' : '',
          editable: this.cellEditCheck,
          headerSort: this.allowHeaderSort(column),
          editor: editorType,
          tooltip: true,
          contextMenu: this.cellContextMenu,
          variableHeight: true,
          headerTooltip: headerTooltip,
          cellEditCancelled: cell => cell.getRow().normalizeHeight(),
          formatter: this.cellFormatter,
          editorParams: {
            verticalNavigation: useVerticalNavigation ? 'editor' : undefined,
            search: true,
            values: column.dataType === 'bool' ? [true, false] : undefined,
            allowEmpty: true,
            // elementAttributes: {
            //   maxLength: column.columnLength // TODO
            // }
          },
        }
        results.push(result)

        if (keyDatas && keyDatas.length > 0) {
          const icon = () => "<i class='material-icons fk-link'>launch</i>"
          const tooltip = () => {
            if (keyDatas.length == 1)
              return `View record in ${keyDatas[0].toTable}`
            else 
              return `View records in ${(keyDatas.map(item => item.toTable).join(', ') as string).replace(/, (?![\s\S]*, )/, ', or ')}`
          }
          let clickMenu = null;
          if (keyDatas.length > 1) {
            clickMenu = [];
            keyDatas.forEach(x => {
              clickMenu.push({
                label: `<x-menuitem><x-label>${x.toTable}(${x.toColumn})</x-label></x-menuitem>`,
                action: (_e, cell) => {
                  this.fkClick(_e, cell, x.toTable, x.toColumn);
                }
              })
            })
          }

          const keyResult = {
            headerSort: false,
            download: false,
            width: keyWidth,
            resizable: false,
            field: column.columnName + '-link--bks',
            title: "",
            cssClass: "foreign-key-button",
            cellClick: clickMenu == null ? this.fkClick : null,
            formatter: icon,
            clickMenu,
            tooltip
          }
          result.cssClass = 'foreign-key'
          results.push(keyResult)
        }

      });

      // add internal index column
      const result = {
        title: this.internalIndexColumn,
        field: this.internalIndexColumn,
        cellClick: this.cellClick,
        maxWidth: globals.maxColumnWidth,
        maxInitialWidth: globals.maxInitialWidth,
        editable: false,
        variableHeight: true,
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
    filterValue() {
      return this.filter.value;
    },
    filterForTabulator() {
      if (this.filterMode === FILTER_MODE_RAW && this.filterRaw) {
        return this.filterRaw
      } else if (
        this.filterMode === FILTER_MODE_BUILDER &&
        this.filter.type && this.filter.field && this.filter.value
      ) {
        
        return [this.filter]
      } else {
        return null
      }
    },
    initialSort() {
      if (!this.table?.columns?.length) {
        return [];
      }

      return [{ column: this.table.columns[0].columnName, dir: "asc" }];
    },
    shouldInitialize() {
      return this.tablesInitialLoaded && this.active && !this.initialized
    }

  },

  watch: {
    shouldInitialize() {
      if (this.shouldInitialize) {
        this.initialize()
      }
    },
    page: _.debounce(function () {
      this.tabulator.setPage(this.page || 1)
    }, 500),
    active() {
      log.debug('active', this.active)
      if (!this.tabulator) return;
      if (this.active) {
        this.tabulator.restoreRedraw()
        if (this.forceRedraw) {
          this.forceRedraw = false
          this.$nextTick(() => {
            this.tabulator.redraw(true)
          })
        }
      } else {
        this.tabulator.blockRedraw()
      }
    },
    table: {
      deep: true,
      async handler() {
        log.debug('table changed', this.tableColumns)
        if(!this.tabulator) {
          return
        }
        if (!this.active) {
          this.forceRedraw = true
        }
        await this.tabulator.setColumns(this.tableColumns)
        await this.refreshTable()
      }
    },
    filterValue() {
      if (this.filter.value === "") {
        this.clearFilter();
      }
    },
    filter: {
      deep: true,
      handler() {
        this.tab.filter = this.filter
        this.$store.dispatch('tabs/save', this.tab)
      }
    },
    filterRaw() {
      if (this.filterRaw === '') {
        this.clearFilter()
      }
    },
    async lastUpdated() {
      this.setlastUpdatedText()
      let result = 'all'
      if (this.primaryKeys?.length && this.filter.value && this.filter.type === '=' && this.isPrimaryKey(this.filter.field)) {
        log.info("setting scope", this.filter.value)
        result = this.filter.value
      } else {
        if (this.filterRaw) result = 'custom'
      }
      this.tab.titleScope = result
      await this.$store.dispatch('tabs/save', this.tab)
    },
    filterMode() {
      this.triggerFilter()
    },
    pendingChangesCount() {
      this.tab.unsavedChanges = this.pendingChangesCount > 0
    }
  },
  beforeDestroy() {
    document.removeEventListener('click', this.maybeUnselectCell)
    if(this.interval) clearInterval(this.interval)
    if (this.tabulator) {
      this.tabulator.destroy()
    }
  },
  async mounted() {
    document.addEventListener('click', this.maybeUnselectCell)
    if (this.shouldInitialize) {
      this.$nextTick(async() => {
        await this.initialize()
      })
    }
  },
  methods: {
    maybeUnselectCell(event) {
      if (!this.selectedCell) return
      if (!this.active) return
      const target = event.target
      const targets = Array.from(this.selectedCell.getElement().getElementsByTagName("*"))
      if (!targets.includes(target)) {
        this.selectedCell.getElement().classList.remove('selected')
        this.selectedCell = null
      }
    },
    async close() {
      this.$root.$emit(AppEvent.closeTab)
    },
    isPrimaryKey(column) {
      return this.primaryKeys.includes(column);
    },
    async initialize() {
      log.info("initializing tab ", this.tab.title, this.tab.tabType)
      this.initialized = true
      this.filter.field = this.table?.columns[0]?.columnName
      if (this.initialFilter) {
        this.filter = _.clone(this.initialFilter)
      }
      this.fetchTableLength()
      this.resetPendingChanges()
      await this.$store.dispatch('updateTableColumns', this.table)
      this.rawTableKeys = await this.connection.getTableKeys(this.table.name, this.table.schema)
      const rawPrimaryKeys = await this.connection.getPrimaryKeys(this.table.name, this.table.schema);
      this.primaryKeys = rawPrimaryKeys.map((key) => key.columnName);
      // @ts-ignore-error
      this.tabulator = new TabulatorFull(this.$refs.table, {
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
        initialFilter: [this.initialFilter || {}],

        // callbacks
        ajaxRequestFunc: this.dataFetch,
        index: this.internalIndexColumn,
        keybindings: {
          scrollToEnd: false,
          scrollToStart: false,
          scrollPageUp: false,
          scrollPageDown: false
        },
        rowContextMenu:[

        ]
      });
      this.tabulator.on('cellEdited', this.cellEdited)

      this.$nextTick(() => {
        if (this.$refs.valueInput) {
          this.$refs.valueInput.focus()
        }
      })
    },
    async fetchTableLength() {
      try {
        if (!this.table) return;
        const length = await this.connection.getTableLength(this.table.name, this.table.schema)
        this.totalRecords = length
      } catch(ex) {
        console.error("unable to get table length", ex)
        this.totalRecords = 0
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
          data: [result]
        }
      })
      return inserts
    },
    defaultColumnWidth(slimType, defaultValue) {
      const chunkyTypes = ['json', 'jsonb', 'blob', 'text', '_text']
      if (chunkyTypes.includes(slimType)) return globals.largeFieldWidth
      return defaultValue
    },
    valueCellFor(cell) {
      const fromColumn = cell.getField().replace(/-link--bks$/g, "")
      const valueCell = cell.getRow().getCell(fromColumn)
      return valueCell
    },
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
      switch (dt) {
        case 'text':
        case 'json':
        case 'jsonb':
        case 'bytea':
        case 'tsvector':
        case '_text':
          return 'textarea'
        case 'bool': return 'select'
        default: return ne
      }
    },
    fkClick(_e, cell, toTable = null, toColumn = null) {
      const fromColumn = cell.getField().replace(/-link--bks$/g, "")
      const valueCell = this.valueCellFor(cell)
      const value = valueCell.getValue()

      const keyDatas = this.tableKeys[fromColumn]
      if (!keyDatas || keyDatas.length === 0) {
        log.error("fk-click, couldn't find key data. Please open an issue. fromColumn:", fromColumn)
        this.$noty.error("Unable to open foreign key. See dev console")
      }
      const keyData = toColumn == null || toTable == null ? keyDatas[0] : keyDatas.find(x => x.toTable === toTable && x.toColumn === toColumn);

      const tableName = keyData.toTable;
      const schemaName = keyData.toSchema;
      const table = this.$store.state.tables.find(t => {
        return (!schemaName || schemaName === t.schema) && t.name === tableName
      })
      if (!table) {
        log.error("fk-click: unable to find destination table", tableName)
        return
      }
      const filter = {
        value,
        type: '=',
        field: keyData.toColumn
      }
      const payload = {
        table, filter, titleScope: value
      }
      log.debug('fk-click: clicked ', value, keyData)
      this.$root.$emit('loadTable', payload)
    },
    copyCell() {
        if (!this.active) return;
        if (!this.selectedCell) return;
        this.selectedCell.getElement().classList.add('copied')
        const cell = this.selectedCell
        setTimeout(() => cell.getElement().classList.remove('copied'), 500)
        this.$native.clipboard.writeText(this.selectedCell.getValue(), false)
    },
    cellClick(_e, cell) {
      if (this.selectedCell) this.selectedCell.getElement().classList.remove("selected")
      this.selectedCell = null
      // this makes it easier to select text if not editing
      if (!this.cellEditCheck(cell)) {
        this.selectedCell = cell
        cell.getElement().classList.add("selected")
      } else {
        setTimeout(() => {
          cell.getRow().normalizeHeight();
        }, 10)

      }
    },
    cellEditCheck(cell) {
      // check this first because it is easy
      if (!this.editable) return false

      const pendingInsert = _.find(this.pendingChanges.inserts, { row: cell.getRow() })

      if (pendingInsert) {
        return true
      }

      const primaryKeys = cell.getRow().getCells().filter(c => this.isPrimaryKey(c.getField())).map(pkCell => ({ value: pkCell.getValue(), column: pkCell.getField()}))
      const pendingDelete = _.find(this.pendingChanges.deletes, (item) => _.isEqual(item.primaryKeys, primaryKeys))

      return this.editable && !this.isPrimaryKey(cell.getColumn().getField()) && !pendingDelete
    },
    cellEdited(cell) {
      const pkCells = cell.getRow().getCells().filter(c => this.isPrimaryKey(c.getField()))

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

      if (currentEdit?.oldValue === cell.getValue()) {
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
    cellCloneRow(_e, cell) {
      const row = cell.getRow()
      const data = { ...row.getData() }

      this.tabulator.addRow(data, true).then(row => {
        this.addRowToPendingInserts(row)
        this.tabulator.scrollToRow(row, 'center', true)
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
    addRowToPendingDeletes(row) {
      const pkCells = row.getCells().filter(c => this.isPrimaryKey(c.getField()))

      if (!pkCells) {
        this.$noty.error("Can't delete row -- couldn't figure out primary key")
        return
      }

      if (this.hasPendingInserts && _.find(this.pendingChanges.inserts, { row: row })) {
        this.$set(this.pendingChanges, 'inserts', _.reject(this.pendingChanges.inserts, { row: row }))
        this.tabulator.deleteRow(row)
        return
      }

      row.getElement().classList.add('deleted')

      const primaryKeys = pkCells.map((cell) => {
        const column = this.table.columns.find(c => c.columnName === cell.getField())
        const isBinary = column.dataType.toUpperCase().includes('BINARY')
        return {
          column: cell.getField(),
          value: isBinary ? Buffer.from(cell.getValue(), 'hex') : cell.getValue()
        }
      })

      const payload = {
        table: this.table.name,
        row: row,
        schema: this.table.schema,
        primaryKeys,
      }

      const matchesFn =  (update) => _.isEqual(update.primaryKeys, payload.primaryKeys)
      // remove pending updates for the row marked for deletion
      const discardedUpdates = _.filter(this.pendingChanges.updates, matchesFn)
      const pendingUpdates = _.without(this.pendingChanges.updates, discardedUpdates)

      discardedUpdates.forEach(update => this.discardColumnUpdate(update))

      this.$set(this.pendingChanges, 'updates', pendingUpdates)

      if (!_.find(this.pendingChanges.deletes, matchesFn)) {
        this.pendingChanges.deletes.push(payload)
      }
    },
    resetPendingChanges() {
      this.pendingChanges = {
        inserts: [],
        updates: [],
        deletes: []
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
            this.tabulator.updateData(result)
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
    triggerFilter() {
      if (this.tabulator) this.tabulator.setData()
    },
    clearFilter() {
      if (this.tabulator) this.tabulator.setData();
    },
    changeFilterMode(filterMode) {
      // Populate raw filter query with existing filter if raw filter is empty
      if (
        filterMode === FILTER_MODE_RAW &&
        !_.isNil(this.filter.value) &&
        !_.isEmpty(this.filter.value) &&
        _.isEmpty(this.filterRaw)
      ) {
        const rawFilter = _.join([this.filter.field, this.filter.type, this.filter.value], ' ')
        this.filterRaw = rawFilter
      }

      this.filterMode = filterMode
      this.$nextTick(() => {
        this.$refs.valueInput.focus()
      })
    },
    dataFetch(_url, _config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      log.info("fetch params", params)
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
      // eslint-disable-next-line no-debugger
      let filters = this.filterForTabulator;

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
            const response = await this.connection.selectTop(
              this.table.name,
              offset,
              limit,
              orderBy,
              filters,
              this.table.schema
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

            const data = this.dataToTableData({ rows: r }, this.tableColumns);
            this.data = Object.freeze(data)
            this.lastUpdated = Date.now()
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
      log.debug('refreshing table')
      const page = this.tabulator.getPage()
      this.fetchTableLength()
      await this.tabulator.replaceData()
      this.tabulator.setPage(page)
      if (!this.active) this.forceRedraw = true
    },
    exportTable() {
      this.trigger(AppEvent.beginExport, { table: this.table })
    },
    exportFiltered() {
      this.trigger(AppEvent.beginExport, {table: this.table, filters: this.filterForTabulator} )
    },
    modifyRowData(data) {
      const output = {};
      const keys = Object.keys(data);

      for(const key of keys) {
        // skip internal columns
        if(key.startsWith(this.internalColumnPrefix)) continue;
        if(key.endsWith('--bks')) continue

        output[key] = data[key];
      }

      return output;
    }
  }
});
</script>
