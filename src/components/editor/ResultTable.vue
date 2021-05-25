<template>
  <div class="result-table">
    <div ref="tabulator"></div>
  </div>
</template>

<script type="text/javascript">
  import Tabulator from 'tabulator-tables'
  import _ from 'lodash'
  import dateFormat from 'dateformat'
  import Converter from '../../mixins/data_converter'
  import Mutators from '../../mixins/data_mutators'
import globals from '@/common/globals'

  export default {
    mixins: [Converter, Mutators],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
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
        const columnWidth = this.result.fields.length > 30 ? globals.bigTableColumnWidth : undefined
        return this.result.fields.map((column) => {
          const result = {
            title: column.name,
            field: column.id,
            titleDownload: column.name,
            dataType: column.dataType,
            width: columnWidth,
            maxInitialWidth: globals.maxInitialWidth,
            mutator: this.resolveTabulatorMutator(column.dataType),
            formatter: this.cellFormatter,
            tooltip: true,
          }
          return result;
        })
      },
    },
    beforeDestroy() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
    },
    async mounted() {
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        data: this.tableData, //link data to table
        reactiveData: true,
        virtualDomHoz: false,
        columns: this.tableColumns, //define table columns
        height: this.actualTableHeight,
        columnMaxWidth: globals.maxColumnWidth,
        nestedFieldSeparator: false,
        cellClick: this.cellClick,
        clipboard: true,
        keybindings: {
          copyToClipboard: false
        },
        downloadConfig: {
          columnHeaders: true
        }
      });
    },
    methods: {
      cellClick(e, cell) {
        this.selectChildren(cell.getElement().querySelector('pre'))
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
