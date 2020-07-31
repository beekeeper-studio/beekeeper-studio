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
      <span v-if="missingPrimaryKey" class="pending-edits">
        <i 
        class="material-icons"
        v-tooltip="'No primary key detected, table editing is disabled.'"
        >warning</i>
      </span>
      <span v-if="pendingEdits.length > 0" class="pending-edits">
        {{pendingEdits.length}} pending edits
        <a @click.prevent="saveChanges" class="btn btn-link">Commit</a>
        <a @click.prevent="discardChanges" class="btn btn-link">Discard</a>
      </span>
      <span ref="paginationArea" class="tabulator-paginator"></span>
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
const log = rawLog.scope('TableTable')

export default {
  components: { Statusbar },
  mixins: [data_converter, DataMutators],
  props: ["table", "connection", "initialFilter"],
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
      pendingEdits: [],
      editError: null
    };
  },
  computed: {
    editable() {
      return this.primaryKey && this.table.entityType === 'table'
    },
    // it's a table, but there's no primary key
    missingPrimaryKey() {
      return this.table.entityType === 'table' && !this.primaryKey
    },
    statusbarMode() {
      if (this.pendingEdits.length > 0) return 'editing'
      if (this.editError) return 'failure'
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
      const results = []
      this.table.columns.forEach(column => {

        const keyData = this.tableKeys[column.columnName]

        const result = {
          title: column.columnName,
          field: column.columnName,
          mutatorData: this.resolveDataMutator(column.dataType),
          dataType: column.dataType,
          cellClick: this.cellClick,
          editable: this.editable,
          editor: this.editable ? 'input' : undefined,
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
            cellClick: this.fkClick,
            formatter: icon,
            tooltip
          }
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
  },
  async mounted() {
    if (this.initialFilter) {
      this.filter = _.clone(this.initialFilter)
    }
    this.rawTableKeys = await this.connection.getTableKeys(this.table.name)
    // TODO (matthew): re-enable after implementing for all DBs
    this.primaryKey = await this.connection.getPrimaryKey(this.table.name)
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
      const table = this.$store.state.tables.find(t => t.name === tableName)
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
        table, filter
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
        column: cell.getField(),
        pkColumn: this.primaryKey,
        primaryKey: pkCell.getValue(),
        oldValue: cell.getOldValue(),
        value: cell.getValue(),
        cell: cell
      }
      this.pendingEdits.push(payload)
    },
    async saveChanges() {
      try {
        const newData = await this.connection.updateValues(this.pendingEdits)
        log.info("new Data: ", newData)
        this.tabulator.updateData(newData)
        this.pendingEdits.forEach(edit => {
          edit.cell.getElement().classList.remove('edited')
          edit.cell.getElement().classList.add('edit-success')
          setTimeout(() => {
            edit.cell.getElement().classList.remove('edit-success')
          }, 1000)
        })
        this.pendingEdits = []
      } catch (ex) {
        this.editError = ex.message
        this.$noty.error(`Unable to save edits: ${ex.message}`)
      }

    },
    discardChanges() {
      this.pendingEdits.forEach(edit => {
        edit.cell.restoreOldValue()
        edit.cell.getElement().classList.remove('edited')
      })
      this.pendingEdits = []
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
            const totalRecords = response.totalRecords;
            this.response = response
            this.pendingEdits = []
            const data = this.dataToTableData({ rows: r }, this.tableColumns);
            this.data = data
            resolve({
              last_page: Math.ceil(totalRecords / limit),
              data
            });
          } catch (error) {
            reject();
            throw error;
          }
        })();
      });
      return result;
    }
  }
};
</script>
