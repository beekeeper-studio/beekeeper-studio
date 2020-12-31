<template>
  <div class="tabletable flex-col">
    <div class="table-filter">
      <form @submit.prevent="triggerFilter">
        <div v-if="filterMode === 'raw'" class="filter-group row gutter">
          <div class="btn-wrap">
            <button class="btn btn-flat btn-fab" type="button" @click.stop="changeFilterMode('builder')" title="Toggle Filter Type">
              <i class="material-icons">sort</i>
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
            <button class="btn btn-primary" type="submit">Search</button>
          </div>
        </div>
        <div v-else-if="filterMode === 'builder'" class="filter-group row gutter">
          <div class="btn-wrap">
            <button class="btn btn-flat btn-fab" type="button" @click.stop="changeFilterMode('raw')" title="Toggle Filter Type">
              <i class="material-icons">code</i>
            </button>
          </div>
          <div>
            <div class="select-wrap">
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
            <button class="btn btn-primary" type="submit">Search</button>
          </div>
        </div>
      </form>
    </div>
    <div ref="table"></div>
    <statusbar :mode="statusbarMode" class="tabulator-footer">
      <div class="col x4">
        <span class="statusbar-item" v-if="lastUpdatedText && !queryError" :title="`${totalRecordsText} Total Records`">
          <i class="material-icons">list_alt</i>
          <span>{{ totalRecordsText }}</span>
        </span>
        <span @click="refreshTable" @keypress.enter="refreshTable" tabindex="0" role="button" class="statusbar-item hoverable" v-if="lastUpdatedText && !queryError" :title="'Updated' + ' ' + lastUpdatedText">
          <i class="material-icons">update</i>
          <span>{{lastUpdatedText}}</span>
        </span>
        <span v-if="queryError" class="statusbar-item error" :title="queryError.message">
          <i class="material-icons">error</i>
          <span class="">{{ queryError.title }}</span>
        </span>
      </div>
      <div class="col x4 flex flex-center">
        <span ref="paginationArea" class="tabulator-paginator" v-show="this.totalRecords > this.limit"></span>
      </div>

      <div class="col x4 pending-edits flex flex-right">
        <div v-if="missingPrimaryKey" class="flex flex-right">
          <span class="statusbar-item">
            <i
            class="material-icons text-danger"
            v-tooltip="'Zero (or multiple) primary keys detected, table editing is disabled.'"
            >warning</i>
          </span>
        </div>
        <div v-if="pendingEditList.length > 0" class="flex flex-right">
          <a @click.prevent="discardChanges" class="btn btn-link">Discard</a>
          <a @click.prevent="saveChanges" class="btn btn-primary btn-icon" :title="pendingEditList.length + ' ' + 'pending edits'" :class="{'error': !!queryError}">
            <!-- <i v-if="queryError" class="material-icons">error</i> -->
            <span class="badge">{{pendingEditList.length}}</span>
            <span>Commit</span>
          </a>

        </div>
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

<script>
import Tabulator from "tabulator-tables";
// import pluralize from 'pluralize'
import data_converter from "../../mixins/data_converter";
import DataMutators from '../../mixins/data_mutators'
import Statusbar from '../common/StatusBar'
import rawLog from 'electron-log'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
const log = rawLog.scope('TableTable')
const FILTER_MODE_BUILDER = 'builder'
const FILTER_MODE_RAW = 'raw'

export default {
  components: { Statusbar },
  mixins: [data_converter, DataMutators],
  props: ["table", "connection", "initialFilter", "tabId", "active"],
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
        field: this.table.columns[0].columnName
      },
      filterRaw: null,
      filterMode: FILTER_MODE_BUILDER,
      headerFilter: true,
      columnsSet: false,
      tabulator: null,
      actualTableHeight: "100%",
      loading: false,
      data: null,
      response: null,
      limit: 100,
      rawTableKeys: [],
      primaryKey: null,
      pendingEdits: {},
      queryError: null,
      timeAgo: new TimeAgo('en-US'),
      lastUpdated: null,
      lastUpdatedText: null,
      interval: setInterval(this.setlastUpdatedText, 10000),
      totalRecords: 0
    };
  },
  computed: {
    filterPlaceholder() {
      return `Enter condition, eg: name like 'Matthew%'`
    },
    totalRecordsText() {
      return `${this.totalRecords.toLocaleString()}`
    },
    pendingEditList() {
      return Object.values(this.pendingEdits)
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
      if (this.pendingEdits.length > 0) return 'editing'
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
      const columnWidth = this.table.columns.length > 20 ? 125 : undefined
      const keyWidth = 40
      const results = []
      // 1. add a column for a real column
      // if a FK, add another column with the link
      // to the FK table.
      this.table.columns.forEach(column => {

        const keyData = this.tableKeys[column.columnName]
        // this needs fixing
        // currently it doesn't fetch the right result if you update the PK
        // because it uses the PK to fetch the result.
        const editable = this.editable && column.columnName !== this.primaryKey
        const slimDataType = this.slimDataType(column.dataType)
        const editorType = this.editorType(column.dataType)
        const useVerticalNavigation = editorType === 'textarea'
        const isPK = this.primaryKey && this.primaryKey === column.columnName

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
          mutatorData: this.resolveDataMutator(column.dataType),
          dataType: column.dataType,
          cellClick: this.cellClick,
          width: columnWidth,
          cssClass: isPK ? 'primary-key' : '',
          editable: editable,
          editor: editable ? editorType : undefined,
          variableHeight: true,
          headerTooltip: headerTooltip,
          cellEditCancelled: cell => cell.getRow().normalizeHeight(),
          formatter: this.cellFormatter,
          editorParams: {
            verticalNavigation: useVerticalNavigation ? 'editor' : undefined,
            search: true,
            values: column.dataType === 'bool' ? [true, false] : undefined
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
      if (this.table.columns.length === 0) {
        return [];
      }

      return [{ column: this.table.columns[0].columnName, dir: "asc" }];
    }
  },

  watch: {
    active() {
      if (!this.tabulator) return;
      if (this.active) {
        this.tabulator.restoreRedraw()
        this.$nextTick(() => {
          this.tabulator.redraw()
        })
      } else {
        this.tabulator.blockRedraw()
      }
    },
    filterValue() {
      if (this.filter.value === "") {
        this.clearFilter();
      }
    },
    filterRaw() {
      if (this.filterRaw === '') {
        this.clearFilter()
      }
    },
    lastUpdated() {
      this.setlastUpdatedText()
      let result = 'all'
      if (this.primaryKey && this.filter.value && this.filter.type === '=' && this.filter.field === this.primaryKey) {
        log.info("setting scope", this.filter.value)
        result = this.filter.value
      } else {
        if (this.filter.value) result = 'filtered'
      }
      this.$emit('setTabTitleScope', this.tabId, result)
    },
    filterMode() {
      this.triggerFilter()
    }
  },
  beforeDestroy() {
    if(this.interval) clearInterval(this.interval)
    if (this.tabulator) {
      this.tabulator.destroy()
    }
  },
  async mounted() {
    if (this.initialFilter) {
      this.filter = _.clone(this.initialFilter)
    }


    this.rawTableKeys = await this.connection.getTableKeys(this.table.name, this.table.schema)
    this.primaryKey = await this.connection.getPrimaryKey(this.table.name, this.table.schema)
    this.tabulator = new Tabulator(this.$refs.table, {
      height: this.actualTableHeight,
      columns: this.tableColumns,
      nestedFieldSeparator: false,
      virtualDomHoz: true,
      ajaxURL: "http://fake",
      ajaxSorting: true,
      ajaxFiltering: true,
      pagination: "remote",
      paginationSize: this.limit,
      paginationElement: this.$refs.paginationArea,
      initialSort: this.initialSort,
      initialFilter: [this.initialFilter || {}],
      lastUpdated: null,
      // callbacks
      ajaxRequestFunc: this.dataFetch,
      index: this.primaryKey,
      keybindings: {
        scrollToEnd: false,
        scrollToStart: false,
        scrollPageUp: false,
        scrollPageDown: false
      }
    });

  },
  methods: {
    valueCellFor(cell) {
      const fromColumn = cell.getField().replace(/-link$/g, "")
      const valueCell = cell.getRow().getCell(fromColumn)
      return valueCell
    },
    slimDataType(dt) {
      if (!dt) return null
      if(dt === 'bit(1)') return dt

return dt.split("(")[0]
    },
    editorType(dt) {
      switch (dt) {
        case 'text': return 'textarea'
        case 'json': return 'textarea'
        case 'jsonb': return 'textarea'
        case 'bool': return 'select'
        default: return 'input'
      }
    },
    fkClick(e, cell) {
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
    cellClick(e, cell) {
      // this makes it easier to select text if not editing
      if (!this.editable) {
        this.selectChildren(cell.getElement())
      } else {
        setTimeout(() => {
          cell.getRow().normalizeHeight();
        }, 10)

      }

    },
    cellEdited(cell) {
      log.info('edit', cell)
      const pkCell = cell.getRow().getCells().find(c => c.getField() === this.primaryKey)
      const column = this.table.columns.find(c => c.columnName === cell.getField())
      if (!pkCell) {
        this.$noty.error("Can't edit column -- couldn't figure out primary key")
        // cell.setValue(cell.getOldValue())
        cell.restoreOldValue()
        return
      }

      if (cell.getValue() === "" && _.isNil(cell.getOldValue())) {
        cell.restoreOldValue()
        return
      }

      cell.getElement().classList.add('edited')
      const key = `${pkCell.getValue()}-${cell.getField()}`
      const currentEdit = this.pendingEdits[key]
      const payload = {
        table: this.table.name,
        schema: this.table.schema,
        column: cell.getField(),
        pkColumn: this.primaryKey,
        columnType: column ? column.dataType : undefined,
        primaryKey: pkCell.getValue(),
        oldValue: currentEdit ? currentEdit.oldValue : cell.getOldValue(),
        cell: cell,
        value: cell.getValue(0)
      }
      this.$set(this.pendingEdits, key, payload)
    },
    async saveChanges() {
      try {
        // throw new Error("This is an error")
        const newData = await this.connection.updateValues(this.pendingEditList)
        const updateIncludedPK = this.pendingEditList.find(e => e.column === e.pkColumn)
        if (updateIncludedPK) {
          this.tabulator.replaceData()
        } else {
          this.tabulator.updateData(newData)
          this.pendingEditList.forEach(edit => {
            edit.cell.getElement().classList.remove('edited')
            edit.cell.getElement().classList.add('edit-success')
            setTimeout(() => {
              edit.cell.getElement().classList.remove('edit-success')
            }, 1000)
          })
        }
        log.info("new Data: ", newData)
        this.pendingEdits = {}
      } catch (ex) {
        this.pendingEditList.forEach(edit => {
          edit.cell.getElement().classList.add('edit-error')
        })
        this.setQueryError('Error Saving Changes', ex.message)
      }

    },
    discardChanges() {
      this.queryError = null
      const updates = []
      this.pendingEditList.forEach(edit => {
        const update = {}
        update[edit.pkColumn] = edit.primaryKey
        update[edit.column] = edit.oldValue
        updates.push(update)
        // this.tabulator.updateData(update)
        // edit.cell.restoreOldValue()
        edit.cell.getElement().classList.remove('edited')
        edit.cell.getElement().classList.remove('edit-error')
      })
      log.debug('discarding -- applying update', updates)
      this.tabulator.updateData(updates)
      this.pendingEdits = {}
    },
    triggerFilter() {
      this.tabulator.setData()
    },
    clearFilter() {
      this.tabulator.setData();
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
    dataFetch(url, config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
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
            const r = response.result;
            this.totalRecords = Number(response.totalRecords) || 0;
            this.response = response
            this.pendingEdits = []
            this.clearQueryError()
            const data = this.dataToTableData({ rows: r }, this.tableColumns);
            this.data = data
            this.lastUpdated = Date.now()
            resolve({
              last_page: Math.ceil(this.totalRecords / limit),
              data
            });
          } catch (error) {
            reject();
            this.setQueryError('Error loading data', error.message)
            this.$nextTick(() => {
              this.tabulator.clearData()
            })
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
    refreshTable() {
      const page = this.tabulator.getPage()
      this.tabulator.replaceData()
      this.tabulator.setPage(page)
    },
  }
};
</script>
