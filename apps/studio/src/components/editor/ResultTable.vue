<template>
  <div
    class="result-table"
    v-hotkey="keymap"
  >
    <div
      ref="tabulator"
      class="spreadsheet-table"
    />
  </div>
</template>

<script type="text/javascript">
  import _ from 'lodash'
  import dateFormat from 'dateformat'
  import Converter from '../../mixins/data_converter'
  import Mutators from '../../mixins/data_mutators'
  import { escapeHtml } from '@shared/lib/tabulator'
  import { dialectFor } from '@shared/lib/dialects/models'
  import globals from '@/common/globals'
  import Papa from 'papaparse'
  import { mapState } from 'vuex'
  import { markdownTable } from 'markdown-table'
  import * as intervalParse from 'postgres-interval'
  import * as td from 'tinyduration'
  import { copyRange, copyActionsMenu, commonColumnMenu, resizeAllColumnsToFitContent, resizeAllColumnsToFixedWidth } from '@/lib/menu/tableMenu';
  import { rowHeaderField } from '@/common/utils'
  import { tabulatorForTableData } from '@/common/tabulator';

  export default {
    mixins: [Converter, Mutators],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
      }
    },
    props: ['result', 'tableHeight', 'query', 'active', 'tab', 'focus'],
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
      result() {
        // This is better than just setting data because
        // the whole dataset has changed.
        this.initializeTabulator()
      },
      tableHeight() {
        this.tabulator.setHeight(this.actualTableHeight)
      },
      focus() {
        if (!this.focus) return
        this.tabulator.rowManager.getElement().focus()
        this.scrollToRangeIfOutOfView()
      },
    },
    computed: {
      ...mapState(['connection', 'usedConfig']),
      keymap() {
        const result = {}
        result[this.ctrlOrCmd('c')] = this.copySelection.bind(this)
        return result
      },
      tableData() {
          return this.dataToTableData(this.result, this.tableColumns)
      },
      tableTruncated() {
          return this.result.truncated
      },
      tableColumns() {
        const columnWidth = this.result.fields.length > 30 ? globals.bigTableColumnWidth : undefined

        const cellMenu = (_e, cell) => {
          return copyActionsMenu({
            range: _.last(cell.getRanges()),
            connection: this.connection,
            table: this.result.tableName,
            schema: this.connection.defaultSchema(),
          })
        }

        const columnMenu = (_e, column) => {
          return [
            ...copyActionsMenu({
              range: _.last(column.getRanges()),
              connection: this.connection,
              table: 'mytable',
              schema: this.connection.defaultSchema(),
            }),
            { separator: true },
            ...commonColumnMenu,
          ]
        }

        const columns = this.result.fields.map((column, index) => {
          const title = column.name || `Result ${index}`
          const result = {
            title,
            titleFormatter() {
              return `<span class="title">${escapeHtml(title)}</span>`
            },
            field: column.id,
            titleDownload: escapeHtml(column.name),
            dataType: column.dataType,
            width: columnWidth,
            mutator: this.resolveTabulatorMutator(column.dataType, dialectFor(this.connection.connectionType)),
            formatter: this.cellFormatter,
            maxInitialWidth: globals.maxColumnWidth,
            tooltip: this.cellTooltip,
            contextMenu: cellMenu,
            headerContextMenu: columnMenu,
            headerMenu: columnMenu,
            resizable: 'header',
            cssClass: 'hide-header-menu-icon',
          }
          if (column.dataType === 'INTERVAL') {
            // add interval sorter
            result['sorter'] = this.intervalSorter;
          }
          return result;
        })

        return columns
      },
      columnIdTitleMap() {
        const result = {}
        this.tableColumns.forEach((column) => {
          result[column.field] = column.title
        })
        return result
      },
      tableId() {
        // the id for a tabulator table
        if (!this.usedConfig.id) return null;

        const workspace = 'workspace-' + this.worskpaceId
        const connection = 'connection-' + this.usedConfig.id
        const table = 'table-' + this.result.tableName
        const columns = 'columns-' + this.result.fields.reduce((str, field) => `${str},${field.name}`, '')
        return `${workspace}.${connection}.${table}.${columns}`
      },
    },
    beforeDestroy() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
    },
    async mounted() {
      this.initializeTabulator()
    },
    methods: {
      initializeTabulator() {
        if (this.tabulator) {
          this.tabulator.destroy()
        }
        this.tabulator = tabulatorForTableData(this.$refs.tabulator, {
          persistenceID: this.tableId,
          data: this.tableData, //link data to table
          columns: this.tableColumns, //define table columns
          height: this.actualTableHeight,
          downloadConfig: {
            columnHeaders: true
          },
        });
      },
      copySelection() {
        if (!document.activeElement.classList.contains('tabulator-tableholder')) return
        copyRange({ range: _.last(this.tabulator.getRanges()), type: 'plain' })
      },
      dataToJson(rawData, firstObjectOnly) {
        const rows = _.isArray(rawData) ? rawData : [rawData]
        const result = rows.map((data) => {
          return this.$bks.cleanData(data, this.tableColumns)
        })
        return firstObjectOnly ? result[0] : result
      },
      download(format) {
        let formatter = format !== 'md' ? format : (rows, options, setFileContents) => {
          const values = rows.map(row => row.columns.map(col => typeof col.value === 'object' ? JSON.stringify(col.value) : col.value))
          setFileContents(markdownTable(values), 'text/markdown')
        };
        // Fix Issue #1493 Lost column names in json query download
        // by overriding the tabulator-generated json with ...what cipboard() does, below:
        formatter = format !== 'json' ? formatter : (rows, options, setFileContents) => {
          setFileContents(
            JSON.stringify(this.dataToJson(this.tabulator.getData(), false), null, "  "), 'text/json'
           )
        };
        const dateString = dateFormat(new Date(), 'yyyy-mm-dd_hMMss')
        const title = this.query.title ? _.snakeCase(this.query.title) : "query_results"

        // xlsx seems to be the only one that doesn't know what 'all' is it would seem https://tabulator.info/docs/5.4/download#xlsx
        const options = typeof formatter !== 'function' && formatter.toLowerCase() === 'xlsx' ? {} : 'all'
        this.tabulator.download(formatter, `${title}-${dateString}.${format}`, options)
      },
      clipboard(format = null) {
        // this.tabulator.copyToClipboard("all")

        const allRows = this.tabulator.getData()
        if (allRows.length == 0) {
          return
        }
        const columnTitles = {}

        const result = this.dataToJson(allRows, false)

        if (format === 'md') {
          const mdContent = [
            Object.keys(result[0]),
            ...result
                .map((row) =>
                  Object.values(row).map(v =>
                    (typeof v === 'object') ? JSON.stringify(v) : v
                  )
                )
          ];
          this.$native.clipboard.writeText(markdownTable(mdContent))
        } else if (format === 'json') {
          this.$native.clipboard.writeText(JSON.stringify(result))
        } else {
          this.$native.clipboard.writeText(
            Papa.unparse(
              result,
              { header: true, delimiter: "\t", quotes: true, escapeFormulae: true }
            )
          )
        }
      },
      // HACK (day): this is probably not the best way of doing things, but postgres intervals are dumb
      intervalSorter(a, b, aRow, bRow, column, dir, sorterParams) {
        try {
          const durationA = td.parse(intervalParse(a).toISOString());
          const durationB = td.parse(intervalParse(b).toISOString());
          const dateA = new Date(durationA.years, durationA.months, durationA.days, durationA.hours, durationA.minutes, durationA.seconds);
          const dateB = new Date(durationB.years, durationB.months, durationB.days, durationB.hours, durationB.minutes, durationB.seconds);
          return dateA - dateB;
        } catch {
          return 0;
        }
      },
      scrollToRangeIfOutOfView() {
        // FIXME This is a copy of how auto scroll works in tabulator
        // SelectRange. We need to make the API available from tabulator
        // instead of copying it here.
        // e.g. this.tabulator.scrollToRangeIfOutOfView
        const range = this.tabulator.getRanges().pop()
        const rangeBounds = range.getBounds()
        const row = rangeBounds.end.row
        const column = rangeBounds.end.column
        const rowRect = row.getElement().getBoundingClientRect();
        const columnRect = column.getElement().getBoundingClientRect();
        const rowManagerRect = this.tabulator.rowManager.getElement().getBoundingClientRect();
        const columnManagerRect = this.tabulator.columnManager.getElement().getBoundingClientRect();

        if(!(rowRect.top >= rowManagerRect.top && rowRect.bottom <= rowManagerRect.bottom)){
          if(row.getElement().parentNode && column.getElement().parentNode){
            // Use faster autoScroll when the elements are on the DOM
            this.tabulator.modules.selectRange.autoScroll(range, row.getElement(), column.getElement());
          }else{
            row.getComponent().scrollTo(undefined, false);
          }
        }

        if(!(columnRect.left >= columnManagerRect.left + this.rowHeaderWidth && columnRect.right <= columnManagerRect.right)){
          if(row.getElement().parentNode && column.getElement().parentNode){
            // Use faster autoScroll when the elements are on the DOM
            this.tabulator.modules.selectRange.autoScroll(range, row.getElement(), column.getElement());
          }else{
            column.getComponent().scrollTo(undefined, false);
          }
        }
      }
    }
	}
</script>
