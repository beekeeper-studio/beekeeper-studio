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
  import { buildMagicColumn } from '../../lib/tabulator/magic_columns'
import { fkColumn } from '../../lib/tabulator/columns'

  export default {
    mixins: [Converter, Mutators],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
      }
    },
    props: ['result', 'tableHeight', 'query', 'active', 'connection'],
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
      magicColumns() {
        const result = {}
        this.result.fields.forEach((column) => {
          result[column.id] = buildMagicColumn(column.name)
        })
        return result
      },
      tableColumns() {
        const columnWidth = this.result.fields.length > 20 ? 125 : undefined
        const results = []

        this.result.fields.forEach((column) => {

          const magic = this.magicColumns[column.id]
          const formatter = magic?.formatLink ? 'link' : this.cellFormatter
          const result = {
            title: magic?.friendlyColumnName || column.name,
            field: column.id,
            titleDownload: column.name,
            dataType: column.dataType,
            cellClick: this.cellClick,
            width: columnWidth,
            mutatorData: this.resolveDataMutator(column.dataType),
            formatter
          }
          results.push(result)
          if (magic?.tableLink) {
            const { table } = magic.tableLink
            const fkData = fkColumn({ id: column.id }, { toTable: table }, this.fkClick)
            results.push(fkData)
          }

        })
        return results
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
      async fkClick(e, cell) {
        console.log('fk click', cell)
        const fromColumnName = cell.getField().replace(/-link$/g, "")
        const valueCell = cell.getRow().getCell(fromColumnName)
        const valueColumn = this.tabulator.getColumn(fromColumnName)
        
        // const column = cell.getColumn()
        // const originalColumn = all.indexOf(column) - 1
        console.log(cell.getField(), fromColumnName, valueCell, valueColumn)
        if (!valueColumn) return

        const magic = this.magicColumns[valueColumn.getField()]

        console.log(magic)
        if (!magic) return

        if (magic?.tableLink) {
          const { table, schema } = magic.tableLink
          if (!table) return
          const pk = await this.connection.getPrimaryKey(table, schema)
          this.$bks.openRecord(this.$root, {
            table, schema,
            pkColumn: pk,
            pkValue: valueCell.getValue()
          })
        }
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
