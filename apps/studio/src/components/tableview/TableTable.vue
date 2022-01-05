<template>
  <div class="tabletable flex-col" :class="{'view-only': !editable}">
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
          <i class="material-icons">error</i>
          <span class="">{{ error.title }}</span>
        </span>
      </div>

      <!-- Pagination -->
      <div class="tabulator-paginator">
        <div class="flex-center flex-middle flex">
          <a @click="page = page  - 1"><i class="material-icons">navigate_before</i></a>
          <input type="number" v-model="page" />
          <a @click="page = page + 1"><i class="material-icons">navigate_next</i></a>
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
          <x-button class="btn btn-primary btn-badge" @click.prevent="saveChanges" :title="saveButtonText" :class="{'error': !!saveError}">
            <i v-if="error" class="material-icons">error</i>
            <span class="badge" v-if="!error">{{pendingChangesCount}}</span>
            <span>Apply</span>
          </x-button>
        </template>
        <template v-if="!editable">
          <span class="statusbar-item" title="Only tables with a single primary key column are editable."><i class="material-icons-outlined">info</i> Read Only</span>
        </template>

        <!-- Actions -->
        <x-button class="btn btn-flat" title="Refresh table" @click="refreshTable">
          <i class="material-icons">refresh</i>
        </x-button>
        <x-button class="btn btn-flat" title="Add row" @click.prevent="cellAddRow">
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
import pluralize from 'pluralize'
import Tabulator from "tabulator-tables";
// import pluralize from 'pluralize'
import data_converter from "../../mixins/data_converter";
import DataMutators from '../../mixins/data_mutators'
import Statusbar from '../common/StatusBar.vue'
import rawLog from 'electron-log'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
import globals from '@/common/globals';
import {AppEvent} from '../../common/AppEvent';
import { vueEditor } from '@shared/lib/tabulator/helpers';
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue';
import { mapState } from 'vuex';

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
      primaryKey: null,
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
      initialized: false
    };
  },
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded']),
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
    cellContextMenu() {
      return [{
          label: '<x-menuitem><x-label>Set Null</x-label></x-menuitem>',
          action: (_e, cell) => {
            cell.setValue(null);
          },
          disabled: !this.editable
        },
        { separator: true },
        {
          label: '<x-menuitem><x-label>Copy</x-label></x-menuitem>',
          action: (_e, cell) => {
            this.$native.clipboard.writeText(cell.getValue());
          },
        },
        {
          label: '<x-menuitem><x-label>Paste</x-label></x-menuitem>',
          action: (_e, cell) => {
            cell.setValue(this.$native.clipboard.readText())
          },
          disabled: !this.editable
        },
        { separator: true },
        {
          label: '<x-menuitem><x-label>Add row</x-label></x-menuitem>',
          action: this.cellAddRow.bind(this),
          disabled: !this.editable
        },
        {
          label: '<x-menuitem><x-label>Clone row</x-label></x-menuitem>',
          action: this.cellCloneRow.bind(this),
          disabled: !this.editable
        },
        {
          label: '<x-menuitem><x-label>Delete row</x-label></x-menuitem>',
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
      return this.primaryKey && this.table.entityType === 'table'
    },
    // it's a table, but there's no primary key
    missingPrimaryKey() {
      return this.table.entityType === 'table' && !this.primaryKey
    },
    statusbarMode() {
      if (this.queryError) return 'failure'
      if (this.pendingChangesCount) return 'editing'
      return null
    },
    tableKeys() {
      const result = {}
      this.rawTableKeys.forEach((item) => {
        result[item.fromColumn] = item
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

        const keyData = this.tableKeys[column.columnName]

        // this needs fixing
        // currently it doesn't fetch the right result if you update the PK
        // because it uses the PK to fetch the result.
        const slimDataType = this.slimDataType(column.dataType)
        const editorType = this.editorType(column.dataType)
        const useVerticalNavigation = editorType === 'textarea'
        const isPK = this.primaryKey && this.primaryKey === column.columnName
        const columnWidth = this.table.columns.length > 30 ?
          this.defaultColumnWidth(slimDataType, globals.bigTableColumnWidth) :
          undefined

        const formatter = () => {
          return `<span class="tabletable-title">${column.columnName} <span class="badge">${slimDataType}</span></span>`
        }

        let headerTooltip = `${column.columnName} ${column.dataType}`
        if (keyData) {
          headerTooltip += ` -> ${keyData.toTable}(${keyData.toColumn})`
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
          contextMenu: this.editable ? this.cellContextMenu : null,
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
          cellEdited: this.cellEdited
        }
        results.push(result)


        if (keyData) {
          const icon = () => "<i class='material-icons fk-link'>launch</i>"
          const tooltip = () => {
            return `View record in ${keyData.toTable}`
          }
          const keyResult = {
            headerSort: false,
            download: false,
            width: keyWidth,
            resizable: false,
            field: column.columnName + '-link',
            title: "",
            cssClass: "foreign-key-button",
            cellClick: this.fkClick,
            formatter: icon,
            tooltip
          }
          result.cssClass = 'foreign-key'
          results.push(keyResult)
        }

      });
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
            log.debug('forceredraw')
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
      if (this.primaryKey && this.filter.value && this.filter.type === '=' && this.filter.field === this.primaryKey) {
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
    if(this.interval) clearInterval(this.interval)
    if (this.tabulator) {
      this.tabulator.destroy()
    }
  },
  async mounted() {
    if (this.shouldInitialize) this.initialize()
  },
  methods: {
    async close() {
      this.$root.$emit(AppEvent.closeTab)
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
      this.primaryKey = await this.connection.getPrimaryKey(this.table.name, this.table.schema)
      this.tabulator = new Tabulator(this.$refs.table, {
        height: this.actualTableHeight,
        columns: this.tableColumns,
        nestedFieldSeparator: false,
        placeholder: "No Data",
        virtualDomHoz: false,
        ajaxURL: "http://fake",
        ajaxSorting: true,
        ajaxFiltering: true,
        ajaxLoaderError: `<span style="display:inline-block">Error loading data, see error below</span>`,
        pagination: "remote",
        paginationSize: this.limit,
        paginationElement: this.$refs.paginationArea,
        paginationButtonCount: 0,
        initialSort: this.initialSort,
        initialFilter: [this.initialFilter || {}],
        // @ts-ignore
        lastUpdated: null,
        // callbacks
        ajaxRequestFunc: this.dataFetch,
        index: this.primaryKey,
        keybindings: {
          scrollToEnd: false,
          scrollToStart: false,
          scrollPageUp: false,
          scrollPageDown: false
        },
        rowContextMenu:[

        ]
      });

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
          if (c === this.primaryKey && !d) {
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
      const fromColumn = cell.getField().replace(/-link$/g, "")
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
    fkClick(_e, cell) {
      log.info('fk-click', cell)
      const fromColumn = cell.getField().replace(/-link$/g, "")
      const valueCell = this.valueCellFor(cell)
      const value = valueCell.getValue()

      const keyData = this.tableKeys[fromColumn]
      const tableName = keyData.toTable
      const schemaName = keyData.toSchema
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
    cellClick(_e, cell) {
      // this makes it easier to select text if not editing
      if (!this.editable) {
        this.selectChildren(cell.getElement())
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

      const primaryKey = cell.getRow().getCells().find(c => c.getField() === this.primaryKey).getValue()
      const pendingDelete = _.find(this.pendingChanges.deletes, { primaryKey: primaryKey })

      return this.editable && cell.getColumn().getField() !== this.primaryKey && !pendingDelete
    },
    cellEdited(cell) {
      log.info('edit', cell)
      const pkCell = cell.getRow().getCells().find(c => c.getField() === this.primaryKey)

      if (!pkCell) {
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


      cell.getElement().classList.add('edited')
      const key = `${pkCell.getValue()}-${cell.getField()}`
      const currentEdit = _.find(this.pendingChanges.updates, { key: key })
      
      if (currentEdit && currentEdit.cell.getInitialValue() === cell.getValue()) {
        this.$set(this.pendingChanges, 'updates', _.without(this.pendingChanges.updates, currentEdit))
        cell.getElement().classList.remove('edited')
        return
      }

      const payload = {
        key: key,
        table: this.table.name,
        schema: this.table.schema,
        column: cell.getField(),
        pkColumn: this.primaryKey,
        columnType: column ? column.dataType : undefined,
        primaryKey: pkCell.getValue(),
        oldValue: cell.getInitialValue(),
        cell: cell,
        value: cell.getValue(0)
      }
      // remove existing pending updates with identical pKey-column combo
      let pendingUpdates = _.reject(this.pendingChanges.updates, { 'key': payload.key })
      pendingUpdates.push(payload)
      this.$set(this.pendingChanges, 'updates', pendingUpdates)
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
        pkColumn: this.primaryKey
      }

      this.pendingChanges.inserts.push(payload)
    },
    addRowToPendingDeletes(row) {
      const pkCell = row.getCells().find(c => c.getField() === this.primaryKey)

      if (!pkCell) {
        this.$noty.error("Can't delete row -- couldn't figure out primary key")       
        return
      }

      if (this.hasPendingInserts && _.find(this.pendingChanges.inserts, { row: row })) {
        this.$set(this.pendingChanges, 'inserts', _.reject(this.pendingChanges.inserts, { row: row }))
        this.tabulator.deleteRow(row)
        return
      }

      row.getElement().classList.add('deleted')

      const payload = {
        table: this.table.name,
        row: row,
        schema: this.table.schema,
        pkColumn: this.primaryKey,
        primaryKey: pkCell.getValue()
      }

        // remove pending updates for the row marked for deletion
        const filter = { 'primaryKey': payload.primaryKey }
        const discardedUpdates = _.filter(this.pendingChanges.updates, filter)
        const pendingUpdates = _.reject(this.pendingChanges.updates, filter)

        discardedUpdates.forEach(update => this.discardColumnUpdate(update))

        this.$set(this.pendingChanges, 'updates', pendingUpdates)

        if (!_.find(this.pendingChanges.deletes, { 'primaryKey': payload.primaryKey })) {
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
      const update = {}
      update[pendingUpdate.pkColumn] = pendingUpdate.primaryKey
      update[pendingUpdate.column] = pendingUpdate.oldValue
      pendingUpdate.cell.getElement().classList.remove('edited')
      pendingUpdate.cell.getElement().classList.remove('edit-error')

      this.tabulator.updateData([update])
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
        _.isEmpty(this.filterRaw)
      ) {
        const rawFilter = _.join([this.filter.field, this.filter.type, this.filter.value], ' ')
        this.filterRaw = rawFilter
      }

      this.filterMode = filterMode
    },
    dataFetch(_url, _config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
      // eslint-disable-next-line no-debugger
      let filters = this.filterForTabulator;

      if (params.sorters) {
        orderBy = params.sorters
      }

      if (params.size) {
        limit = params.size
      }

      if (params.page) {
        offset = (params.page - 1) * limit;
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
            if (_.difference(response.fields, this.table.columns.map(c => c.columnName)).length > 0) {
              log.debug('table has changed, updating')
              await this.$store.dispatch('updateTableColumns', this.table)
            }

            const r = response.result;
            this.response = response
            this.resetPendingChanges()
            this.clearQueryError()
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
    }
  }
});
</script>
