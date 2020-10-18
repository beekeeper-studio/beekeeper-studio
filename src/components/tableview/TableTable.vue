<template>
  <div class="tabletable flex-col">
    <div class="table-filter">
      <form @submit.prevent="triggerFilter">
        <div class="filter-group row gutter">
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
        <span class="statusbar-item" v-if="lastUpdatedText && !editError" :title="`${totalRecordsText} Total Records`">
          <i class="material-icons">list_alt</i>
          <span>{{ totalRecordsText }}</span>
        </span>
        <span class="statusbar-item" v-if="lastUpdatedText && !editError" :title="'Updated' + ' ' + lastUpdatedText">
          <i class="material-icons">update</i>
          <span>{{lastUpdatedText}}</span>
        </span>
        <span v-if="editError" class="statusbar-item error" :title="editError">
          <i class="material-icons">error</i>
          <span class="">Error Saving Changes</span>
        </span>
      </div>
      <div class="col x4 flex flex-center">
        <span ref="paginationArea" class="tabulator-paginator" v-show="this.totalRecords > this.limit"></span>
      </div>

      <div class="col x4 pending-edits flex flex-right">
        <div v-if="missingPrimaryKey" class="flex flex-right">
          <span class="statusbar-item">
            <i
            class="material-icons"
            v-tooltip="'No primary key detected, table editing is disabled.'"
            >warning</i>
          </span>
        </div>
        <div v-if="pendingChangesCount > 0" class="flex flex-right">
          <a @click.prevent="discardChanges" class="btn btn-link">Discard</a>
          <a @click.prevent="saveChanges" class="btn btn-primary btn-icon" :title="pendingChangesCount + ' ' + 'pending edits'" :class="{'error': !!editError}">
            <!-- <i v-if="editError" class="material-icons">error</i> -->
            <span class="badge">{{pendingChangesCount}}</span>
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

const CHANGE_TYPE_INSERT = 'insert'
const CHANGE_TYPE_UPDATE = 'update'
const CHANGE_TYPE_DELETE = 'delete'

const log = rawLog.scope('TableTable')

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
      pendingChanges: {
        inserts: [],
        updates: [],
        deletes: []
      },
      editError: null,
      timeAgo: new TimeAgo('en-US'),
      lastUpdated: null,
      lastUpdatedText: null,
      interval: setInterval(this.setlastUpdatedText, 10000),
      totalRecords: 0
    };
  },
  computed: {
    totalRecordsText() {
      return `${this.totalRecords.toLocaleString()}`
    },
    pendingChangesCount() {
      return this.pendingChanges.inserts.length 
             + this.pendingChanges.updates.length 
             + this.pendingChanges.deletes.length
    },
    hasPendingChanges() {
        return this.pendingChangesCount > 0
    },
    editable() {
      return this.primaryKey && this.table.entityType === 'table'
    },
    // it's a table, but there's no primary key
    missingPrimaryKey() {
      return this.table.entityType === 'table' && !this.primaryKey
    },
    statusbarMode() {
      if (this.editError) return 'failure'
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
          editable: this.cellEditCheck,
          editor: editorType,
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

    this.resetPendingChanges()

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
      },
      rowContextMenu:[
        {
          label: "Add row",
          action: () => {
            this.tabulator.addRow({}, false).then(row => { 
              this.addRowToPendingInserts(row)
              this.tabulator.scrollToRow(row, 'bottom', false)
            })
          }
        },
        {
          label: "Clone row",
          action: (e, row) => {
            this.tabulator.addRow(row.getData(), false).then(row => this.addRowToPendingInserts(row))
          }
        },
        {
          label: "Delete Row",
          action: (e, row) => {
            this.addRowToPendingDeletes(row)
          }
        },
      ]
    });

  },
  methods: {
    valueCellFor(cell) {
      const fromColumn = cell.getField().replace(/-link$/g, "")
      const valueCell = cell.getRow().getCell(fromColumn)
      return valueCell
    },
    slimDataType(dt) {
      if (dt) {
        return dt.split("(")[0]
      }
      return null
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
    cellEditCheck(cell) {
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

      // Dont handle cell edit if made on a pending insert
      if (_.find(this.pendingChanges.inserts, { row: cell.getRow() })) {
        return
      }

      const pkCell = cell.getRow().getCells().find(c => c.getField() === this.primaryKey)
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
      const currentEdit = _.find(this.pendingChanges.updates, { key: key })
      const payload = {
        key: key,
        table: this.table.name,
        schema: this.table.schema,
        column: cell.getField(),
        pkColumn: this.primaryKey,
        primaryKey: pkCell.getValue(),
        oldValue: currentEdit ? currentEdit.oldValue : cell.getOldValue(),
        cell: cell,
        value: cell.getValue(0)
      }

      this.addPendingChange(CHANGE_TYPE_UPDATE, payload)
    },
    addRowToPendingInserts(row) {
      row.getElement().classList.add('inserted')

      const payload = {
        table: this.table.name,
        row: row,
        schema: this.table.schema,
        pkColumn: this.primaryKey
      }

      this.addPendingChange(CHANGE_TYPE_INSERT, payload)
    },
    addRowToPendingDeletes(row) {
      row.getElement().classList.add('deleted')
      const pkCell = row.getCells().find(c => c.getField() === this.primaryKey)

      if (!pkCell) {
        this.$noty.error("Can't delete row -- couldn't figure out primary key")       
        return
      }

      const payload = {
        table: this.table.name,
        row: row,
        schema: this.table.schema,
        pkColumn: this.primaryKey,
        primaryKey: pkCell.getValue()
      }

      this.addPendingChange(CHANGE_TYPE_DELETE, payload)
    },
    addPendingChange(changeType, payload) {
      if (changeType === CHANGE_TYPE_INSERT) {
        this.pendingChanges.inserts.push(payload)
      }

      if (changeType === CHANGE_TYPE_UPDATE) {
        // remove existing pending updates with identical pKey-column combo
        let pendingUpdates = _.reject(this.pendingChanges.updates, { 'key': payload.key })
        pendingUpdates.push(payload)

        this.$set(this.pendingChanges, 'updates', pendingUpdates)
      }

      if (changeType === CHANGE_TYPE_DELETE) {
        // remove pending updates for the row marked for deletion
        let filter = { 'primaryKey': payload.primaryKey }
        let discardedUpdates = _.filter(this.pendingChanges.updates, filter)
        let pendingUpdates = _.reject(this.pendingChanges.updates, filter)

        discardedUpdates.forEach(update => this.discardColumnUpdate(update))

        this.$set(this.pendingChanges, 'updates', pendingUpdates)

        if (!_.find(this.pendingChanges.deletes, { 'primaryKey': payload.primaryKey })) {
          this.pendingChanges.deletes.push(payload)
        }
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
      try {
        let replaceData = false

        const result = await this.connection.applyChanges(this.pendingChanges)

        // reload data on insert and/or delete changes
        if (this.pendingChanges.inserts.length > 0 || this.pendingChanges.deletes.length > 0) {
          replaceData = true
        }

        // handle update result
        if (this.pendingChanges.updates.length > 0) {
          const updateIncludedPK = this.pendingChanges.updates.find(e => e.column === e.pkColumn)
          if (updateIncludedPK) {
            replaceData = true
          } else {
            this.tabulator.updateData(result.updates)
            this.pendingChanges.updates.forEach(edit => {
              edit.cell.getElement().classList.remove('edited')
              edit.cell.getElement().classList.add('edit-success')
              setTimeout(() => {
                edit.cell.getElement().classList.remove('edit-success')
              }, 1000)
            })
          }
          log.info("new Data: ", result.updates)
        }

        if (replaceData) {
          this.tabulator.replaceData()
        } else {
          this.resetPendingChanges()
        }

      } catch (ex) {
        this.pendingChanges.updates.forEach(edit => {
          edit.cell.getElement().classList.add('edit-error')
        })
        this.editError = ex.message
      }

    },
    discardChanges() {
      this.editError = null

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
      if (this.filter.type && this.filter.field) {
        if (this.filter.value) {
          this.tabulator.setFilter(
            this.filter.field,
            this.filter.type,
            this.filter.value
          );
        } else {
          this.tabulator.clearFilter();
        }
      }
    },
    clearFilter() {
      this.tabulator.clearFilter();
    },
    dataFetch(url, config, params) {
      // this conforms to the Tabulator API
      // for ajax requests. Except we're just calling the database.
      // we're using paging so requires page info
      let offset = 0;
      let limit = this.limit;
      let orderBy = null;
      let filters = null;

      if (params.sorters) {
        orderBy = params.sorters
      }

      if (params.size) {
        limit = params.size
      }

      if (params.page) {
        offset = (params.page - 1) * limit;
      }

      if (params.filters) {
        filters = params.filters;
      }

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
            this.resetPendingChanges()
            this.editError = null
            const data = this.dataToTableData({ rows: r }, this.tableColumns);
            this.data = data
            this.lastUpdated = Date.now()
            resolve({
              last_page: Math.ceil(this.totalRecords / limit),
              data
            });
          } catch (error) {
            reject();
            throw error;
          }
        })();
      });
      return result;
    },
    setlastUpdatedText() {
      if (!this.lastUpdated) return null
      this.lastUpdatedText = this.timeAgo.format(this.lastUpdated)
    },

  }
};
</script>
