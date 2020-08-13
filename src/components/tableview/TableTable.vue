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
        <span class="statusbar-item flex flex-middle" v-if="lastUpdatedText && !editError" :title="'Updated' + ' ' + lastUpdatedText">
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
        <div v-if="pendingEditList.length > 0" class="flex flex-right">
          <a @click.prevent="discardChanges" class="btn btn-link">Discard</a>
          <a @click.prevent="saveChanges" class="btn btn-primary btn-icon" :title="pendingEditList.length + ' ' + 'pending edits'" :class="{'error': !!editError}">
            <!-- <i v-if="editError" class="material-icons">error</i> -->
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
import data_converter from "../../mixins/data_converter";
import DataMutators from '../../mixins/data_mutators'
import Statusbar from '../common/StatusBar'
import rawLog from 'electron-log'
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago'
const log = rawLog.scope('TableTable')

export default {
  components: { Statusbar },
  mixins: [data_converter, DataMutators],
  props: ["table", "connection", "initialFilter", "tabId"],
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
      pendingEdits: {},
      editError: null,
      timeAgo: new TimeAgo('en-US'),
      lastUpdated: null,
      lastUpdatedText: null,
      interval: setInterval(this.setlastUpdatedText, 10000),
      totalRecords: 0
    };
  },
  computed: {
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
      if (this.editError) return 'failure'
      if (this.pendingEdits.length > 0) return 'editing'
      return null
    },
    tableKeys() {
      const result = {}
      console.log(this.rawTableKeys)
      this.rawTableKeys.forEach((item) => {
        result[item.fromColumn] = item
      })
      return result
    },
    tableColumns() {
      const results = []
      // 1. add a column for a real column
      // if a FK, add another column with the link
      // to the FK table.
      this.table.columns.forEach(column => {

        const keyData = this.tableKeys[column.columnName]
        const editable = this.editable && column.columnName !== this.primaryKey

        const result = {
          title: column.columnName,
          field: column.columnName,
          mutatorData: this.resolveDataMutator(column.dataType),
          dataType: column.dataType,
          cellClick: this.cellClick,
          editable: editable,
          editor: editable ? 'input' : undefined,
          editorParams: {
            search: true,
            // elementAttributes: {
            //   maxLength: column.columnLength // TODO
            // }
          },
          cellEdited: this.cellEdited
        }
        results.push(result)
        

        if (keyData) {
          const icon = () => "<i class='material-icons fk-link'>launch</i>"
          const tooltip = (cell) => {
            return `View records in ${keyData.toTable} with ${keyData.toColumn} = ${cell.getValue()}`
          }
          const keyResult = {
            headerSort: false,
            download: false,
            field: column.columnName,
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
  },
  async mounted() {
    if (this.initialFilter) {
      this.filter = _.clone(this.initialFilter)
    }
    
    this.rawTableKeys = await this.connection.getTableKeys(this.table.name, this.table.schema)
    // TODO (matthew): re-enable after implementing for all DBs
    this.primaryKey = await this.connection.getPrimaryKey(this.table.name, this.table.schema)
    this.tabulator = new Tabulator(this.$refs.table, {
      height: this.actualTableHeight,
      columns: this.tableColumns,
      nestedFieldSeparator: false,
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
      index: this.primaryKey
    });

  },
  methods: {
    fkClick(e, cell) {
      log.info('fk-click', cell)
      const value = cell.getValue()
      const fromColumn = cell.getField()
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
      }

    },
    cellEdited(cell) {
      log.info('edit', cell)
      cell.getElement().classList.add('edited')
      const pkCell = cell.getRow().getCells().find(c => c.getField() === this.primaryKey)
      if (!pkCell) {
        this.$noty.error("Can't edit column -- couldn't figure out primary key")
        // cell.setValue(cell.getOldValue())
        cell.restoreOldValue()
        console.log(cell)
        return
      }
      const payload = {
        table: this.table.name,
        schema: this.table.schema,
        column: cell.getField(),
        pkColumn: this.primaryKey,
        primaryKey: pkCell.getValue(),
        oldValue: cell.getOldValue(),
        value: cell.getValue(),
        cell: cell
      }
      const key = `${payload.primaryKey}-${payload.column}`
      this.$set(this.pendingEdits, key, payload)
    },
    async saveChanges() {
      try {
        // throw new Error("This is an error")
        const newData = await this.connection.updateValues(this.pendingEditList)
        log.info("new Data: ", newData)
        this.tabulator.updateData(newData)
        this.pendingEditList.forEach(edit => {
          edit.cell.getElement().classList.remove('edited')
          edit.cell.getElement().classList.add('edit-success')
          setTimeout(() => {
            edit.cell.getElement().classList.remove('edit-success')
          }, 1000)
        })
        this.pendingEdits = {}
      } catch (ex) {
        this.pendingEditList.forEach(edit => {
          edit.cell.getElement().classList.add('edit-error')
        })
        this.editError = ex.message
      }

    },
    discardChanges() {
      this.editError = null
      this.pendingEditList.forEach(edit => {
        edit.cell.restoreOldValue()
        edit.cell.getElement().classList.remove('edited')
        edit.cell.getElement().classList.remove('edit-error')
      })
      this.pendingEdits = {}
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
            this.totalRecords = response.totalRecords;
            this.response = response
            this.pendingEdits = []
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
