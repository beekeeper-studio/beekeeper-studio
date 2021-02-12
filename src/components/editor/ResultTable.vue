<template>
  <div class="result-table">
    <ag-grid-vue
       style="width: 100%; height: 100%;"
      class="ag-theme-balham-dark"
      :columnDefs="tableColumns"
      :rowData="tableData"
      :enableRangeSelection="true"
    ></ag-grid-vue>
    <!-- ALREADY A FEATURE BEHIND THE PAYWALL https://www.ag-grid.com/documentation/vue/range-selection/ -->
    <!-- <div ref="tabulator"></div> -->
  </div>
</template>

<script type="text/javascript">
  import { AgGridVue } from "ag-grid-vue";
  // import Tabulator from 'tabulator-tables'
  import _ from 'lodash'
  import dateFormat from 'dateformat'
  import Converter from '../../mixins/data_converter'
  import Mutators from '../../mixins/data_mutators'

  export default {
    mixins: [Converter, Mutators],
    components: { AgGridVue },
    data() {
      return {
        tabulator: null,
        agGrid: null
      }
    },
    props: ['result', 'tableHeight', 'query', 'active'],
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
      tableData: {
        handler() {
          this.tabulator.replaceData(this.tableData)
        }
      },
      tableColumns: {
        handler() {
          this.tabulator.setColumns(this.tableColumns)
        }
      },
      tableHeight() {
        this.tabulator.setHeight(this.actualTableHeight)
      }
    },
    computed: {
      tableData() {
          return this.dataToTableData(this.result, this.tableColumns)
      },
      tableTruncated() {
          return this.result.truncated
      },
      tableColumns() {
        // const columnWidth = this.result.fields.length > 20 ? 125 : undefined
        return this.result.fields.map((column) => {
          const result = {
            headerName: column.name,
            field: column.id,
            sortable: true,
            filter: true
            // dataType: column.dataType,
            // width: columnWidth,
            // mutatorData: this.resolveDataMutator(column.dataType),
            // formatter: this.cellFormatter
          }
          return result;
        })
      },
      actualTableHeight() {
        return '100%'
        // let result = this.tableHeight
        // if (this.tableHeight == 0) {
        //   result = '100%'
        // }
        // return result
      },
    },
    beforeDestroy() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
    },
    async mounted() {



      // this.tabulator = new Tabulator(this.$refs.tabulator, {
      //   data: this.tableData, //link data to table
      //   reactiveData: true,
      //   virtualDomHoz: false,
      //   columns: this.tableColumns, //define table columns
      //   height: this.actualTableHeight,
      //   nestedFieldSeparator: false,
      //   cellClick: this.cellClick,
      //   clipboard: true,
      //   keybindings: {
      //     copyToClipboard: false
      //   },
      //   downloadConfig: {
      //     columnHeaders: true
      //   }
      // });
    },
    methods: {
      cellClick(e, cell) {
        this.selectChildren(cell.getElement())
      },
      download(format) {
        const dateString = dateFormat(new Date(), 'yyyy-mm-dd_hMMss')
        const title = this.query.title ? _.snakeCase(this.query.title) : "query_results"
        this.tabulator.download(format, `${title}-${dateString}.${format}`, 'all')
      },
      clipboard() {
        this.tabulator.copyToClipboard("table", true)
        this.$noty.info("Table data copied to clipboard")
      }
    }
	}
</script>
