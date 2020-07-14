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
    <statusbar class="tabulator-footer">

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


export default {
  components: { Statusbar },
  mixins: [data_converter, DataMutators],
  props: ["table", "connection"],
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
      limit: 100
    };
  },
  computed: {
    tableColumns() {
      return this.table.columns.map(column => {
        const result = {
          title: column.columnName,
          field: column.columnName,
          mutatorData: this.resolveDataMutator(column.dataType),
          dataType: column.dataType
        }
        return result
      });
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
    this.tabulator = new Tabulator(this.$refs.table, {
      height: this.actualTableHeight,
      columns: this.tableColumns,
      nestedFieldSeparator: false,
      ajaxRequestFunc: this.dataFetch,
      ajaxURL: "http://fake",
      ajaxSorting: true,
      ajaxFiltering: true,
      pagination: "remote",
      paginationSize: this.limit,
      paginationElement: this.$refs.paginationArea,
      initialSort: this.initialSort,
      cellClick: this.cellClick
    });
  },
  methods: {
    cellClick(e, cell) {
      this.selectChildren(cell.getElement())
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
