<template>
  <div
    class="result-table"
    :class="{ 'hidden-filter': hiddenFilter }"
    v-hotkey="keymap"
  >
    <form
      class="table-search-wrapper table-filter"
      @submit.prevent="searchHandler"
      v-hotkey="tableFilterKeymap"
    >
      <div class="input-wrapper filter">
        <input
          type="text"
          v-model="filterValue"
          ref="filterInput"
          class="form-control filter-value"
          placeholder="Search Results"
        >
        <button
          type="button"
          class="clear btn-link"
          title="clear search filter"
          @click.prevent="clearSearchFilters"
        >
          <i class="material-icons">cancel</i>
        </button>
      </div>
      <button
        type="submit"
        class="btn btn-primary btn-fab"
        title="filter results table"
      >
        <i class="material-icons">search</i>
      </button>
      <button
        class="close-btn btn btn-flat btn-fab"
        title="Close filter"
        @click="closeTableFilter"
      >
        <i class="material-icons">close</i>
      </button>
    </form>
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
  import { FkLinkMixin } from '@/mixins/fk_click'
  import MagicColumnBuilder from '@/lib/magic/MagicColumnBuilder'
  import Papa from 'papaparse'
  import { mapState, mapGetters } from 'vuex'
  import { markdownTable } from 'markdown-table'
  import intervalParse from 'postgres-interval'
  import * as td from 'tinyduration'
  import { copyRanges, copyActionsMenu, commonColumnMenu, resizeAllColumnsToFitContent, resizeAllColumnsToFixedWidth, createMenuItem } from '@/lib/menu/tableMenu';
  import { rowHeaderField } from '@/common/utils'
  import { tabulatorForTableData } from '@/common/tabulator';
  import { AppEvent } from "@/common/AppEvent";
  import XLSX from 'xlsx';
  import { parseRowDataForJsonViewer } from '@/lib/data/jsonViewer'

  export default {
    mixins: [Converter, Mutators, FkLinkMixin],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
        selectedRowData: {},
        filterValue: '',
        selectedRowPosition: -1,
        hiddenFilter: true,
      }
    },
    props: ['result', 'tableHeight', 'query', 'active', 'tab', 'focus', 'binaryEncoding'],
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
        this.triggerFocus()
        this.scrollToRangeIfOutOfView()
      },
    },
    computed: {
      ...mapState(['usedConfig', 'defaultSchema', 'connectionType', 'connection']),
      ...mapGetters(['isUltimate']),
      ...mapGetters('popupMenu', ['getExtraPopupMenu']),
      keymap() {
        return this.$vHotkeyKeymap({
          'queryEditor.copyResultSelection': this.copySelection.bind(this),
          'queryEditor.openTableFilter': this.focusOnFilterInput.bind(this),
        });
      },
      tableFilterKeymap() {
        return this.$vHotkeyKeymap({
          'queryEditor.closeTableFilter': this.closeTableFilter.bind(this),
        });
      },
      tableData() {
          return this.dataToTableData(this.result, this.tableColumns)
      },
      tableTruncated() {
          return this.result.truncated
      },
      tableColumns() {
        const columnWidth = this.result.fields.length > 30 ? this.$bksConfig.ui.tableTable.defaultColumnWidth : undefined

        const filterMenuItem = {
          label: createMenuItem("Search results"),
          action: () => {
            this.focusOnFilterInput()
          }
        }

        const cellMenu = (_e, cell) => {
          return [
            ...copyActionsMenu({
              ranges: cell.getRanges(),
              table: this.result.tableName,
              schema: this.defaultSchema,
            }),
            { separator: true },
            filterMenuItem,
            ...this.getExtraPopupMenu('results.cell', { transform: "tabulator" }),
          ]
        }

        const columnMenu = (_e, column) => {
          return [
            ...copyActionsMenu({
              ranges: column.getRanges(),
              table: this.result.tableName,
              schema: this.defaultSchema,
            }),
            { separator: true },
            ...commonColumnMenu,
            { separator: true },
            filterMenuItem,
            ...this.getExtraPopupMenu('results.columnHeader', { transform: "tabulator" }),
          ]
        }

        const columns = this.result.fields.flatMap((column, index) => {
          const results = []
          const magic = MagicColumnBuilder.build(column.name) || {}
          const title = magic?.title ?? column.name ?? `Result ${index}`

          let cssClass = 'hide-header-menu-icon'

          if (magic.cssClass) {
            cssClass += ` ${magic.cssClass}`
          }

          if (magic.formatterParams?.fk) {
            magic.formatterParams.fkOnClick = (_e, cell) => this.fkClick(magic.formatterParams.fk[0], cell)
          }

          const magicStuff = _.pick(magic, ['formatter', 'formatterParams'])
          const defaults = {
            formatter: this.cellFormatter,
            formatterParams: {
              binaryEncoding: this.binaryEncoding,
            },
          }

          const result = {
            ...defaults,
            title,
            titleFormatter() {
              return `<span class="title">${escapeHtml(title)}</span>`
            },
            field: column.id,
            titleDownload: escapeHtml(column.name),
            dataType: column.dataType,
            width: columnWidth,
            mutator: this.resolveTabulatorMutator(column.dataType, dialectFor(this.connectionType)),
            formatter: this.cellFormatter,
            maxInitialWidth: this.$bksConfig.ui.tableTable.maxColumnWidth,
            tooltip: this.cellTooltip,
            contextMenu: cellMenu,
            headerContextMenu: columnMenu,
            headerMenu: columnMenu,
            resizable: 'header',
            cssClass,
            ...magicStuff
          }

          if (column.dataType === 'INTERVAL') {
            // add interval sorter
            result['sorter'] = this.intervalSorter;
          }

          results.push(result)

          if (magic && magic.tableLink) {
            const fkCol = this.fkColumn(result, [magic.tableLink])
            results.push(fkCol)
          }
          return results;
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
      selectedRowId() {
        return `${this.tableId ? `${this.tableId}.` : ''}tab-${this.tab.id}.row-${this.selectedRowPosition}`
      },
      rootBindings() {
        return [
          { event: AppEvent.switchedTab, handler: this.handleSwitchedTab },
        ]
      },
    },
    beforeDestroy() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
      this.unregisterHandlers(this.rootBindings)
    },
    async mounted() {
      this.initializeTabulator()
      if (this.focus) {
        const onTableBuilt = () => {
          this.triggerFocus()
          this.tabulator.off('tableBuilt', onTableBuilt)
        }
        this.tabulator.on('tableBuilt', onTableBuilt)
      }
      if (this.active) {
        this.handleTabActive()
      }
      this.registerHandlers(this.rootBindings)
    },
    methods: {
      initializeTabulator() {
        if (this.tabulator) {
          this.tabulator.destroy()
        }
        this.tabulator = tabulatorForTableData(this.$refs.tabulator, {
          table: this.result.tableName,
          schema: this.result.schema,
          persistenceID: this.tableId,
          data: this.tableData, //link data to table
          columns: this.tableColumns, //define table columns
          height: this.actualTableHeight,
          downloadConfig: {
            columnHeaders: true
          },
          onRangeChange: this.handleRangeChange,
          rowHeader: {
            contextMenu: (_e, cell) => {
              return [
                ...copyActionsMenu({
                  ranges: cell.getRanges(),
                  table: this.result.tableName || "mytable",
                  schema: this.result.schema,
                }),
                ...this.getExtraPopupMenu('results.rowHeader', { transform: "tabulator" }),
              ];
            },
            headerContextMenu: (_e, column) => {
              return [
                ...copyActionsMenu({
                  ranges: column.getTable().getRanges(),
                  table: this.result.tableName || "mytable",
                  schema: this.result.schema,
                }),
                { separator: true },
                resizeAllColumnsToFitContent,
                resizeAllColumnsToFixedWidth,
                ...this.getExtraPopupMenu('results.corner', { transform: "tabulator" }),
              ];
            },
          },
        });
      },
      focusOnFilterInput() {
        this.hiddenFilter = false
        this.$nextTick(() => {
          this.$refs.filterInput.focus()
        })
      },
      closeTableFilter() {
        this.hiddenFilter = true
        if (this.$refs.filterInput !== document.activeElement) return
        this.triggerFocus()
      },
      searchHandler() {
        this.tabulator.clearFilter()

        const columns = this.tableColumns
        const filters = columns.map(({field}) => ({
          type: 'like',
          value: this.filterValue.trim(),
          field
        }))

        this.tabulator.setFilter([filters])
      },
      clearSearchFilters() {
        this.filterValue = ''
        this.tabulator.clearFilter()
      },
      checkTableFocus() {
        const classes = [...document.activeElement.classList.values()];
        return classes.some(c => c.startsWith('tabulator'));
      },
      copySelection() {
        const isFocusingTable = this.checkTableFocus();
        if (!this.active || !isFocusingTable) return
        copyRanges({ ranges: this.tabulator.getRanges(), type: 'plain' })
      },
      dataToJson(rawData, firstObjectOnly) {
        const rows = _.isArray(rawData) ? rawData : [rawData]
        const result = rows.map((data) => {
          return this.$bks.cleanData(data, this.tableColumns)
        })
        return firstObjectOnly ? result[0] : result
      },
      download(format) {
        let formatter = format;
        const dateString = dateFormat(new Date(), 'yyyy-mm-dd_hMMss');
        const title = this.query.title ? _.snakeCase(this.query.title) : 'query_results';

        if(format === 'md'){
          formatter = (rows, options, setFileContents) => {
            const values = rows.map(row => row.columns.map(col => typeof col.value === 'object' ? JSON.stringify(col.value) : col.value));
            setFileContents(markdownTable(values), 'text/markdown')
          };
        }

        // Fix Issue #1493 Lost column names in json query download
        // by overriding the tabulator-generated json with ...what cipboard() does, below:
        if(format === 'json'){
          formatter = (rows, options, setFileContents) => {
             const newValue = JSON.stringify(this.dataToJson(this.tabulator.getData(), false), null, "  ");
             setFileContents(newValue, 'text/json');
          };
        }

        // Fix Issue #2863 replacing null values with empty string
        if(format === 'xlsx'){
          formatter = (rows, options, setFileContents) => {
             const values = rows.map(row => row.columns.map(col => {
               if(col.value === null){
                 return '';
               }

               if(typeof col.value === 'object'){
                 return JSON.stringify(col.value);
               }

               return col.value;
              })
            );

             const ws = XLSX.utils.aoa_to_sheet(values);
             const wb = XLSX.utils.book_new();

             // sheet title cannot be more than 31 characters and sheet title cannot be 'history'
             // source: https://support.microsoft.com/en-us/office/rename-a-worksheet-3f1f7148-ee83-404d-8ef0-9ff99fbad1f9
             let sheetTitle = title.slice(0,31);
             if (title.toLowerCase() === "history") {
              sheetTitle = "history-sheet";
             }

             XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
             const excel = XLSX.write(wb, { type: 'buffer' });
             setFileContents(excel);
          }
        }

        this.tabulator.download(formatter, `${title}-${dateString}.${format}`, 'all');
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
      },
      triggerFocus() {
        this.tabulator.rowManager.getElement().focus();
      },
      updateJsonViewerSidebar() {
        /** @type {import('@/lib/data/jsonViewer').UpdateOptions} */
        const data = {
          dataId: this.selectedRowId,
          value: this.selectedRowData,
          expandablePaths: [],
          editablePaths: [],
          signs: {},
        }
        this.trigger(AppEvent.updateJsonViewerSidebar, data)
      },
      handleRangeChange(ranges) {
        const row = ranges[0].getRows()[0];
        const parsedData = parseRowDataForJsonViewer(row.getData(), this.tableColumns)
        this.selectedRowData = this.dataToJson(parsedData, true)
        this.selectedRowPosition = row.getPosition()
        this.updateJsonViewerSidebar()
      },
      handleTabActive() {
        this.updateJsonViewerSidebar()
      },
      handleSwitchedTab(tab) {
        if (tab.id === this.tab.id) {
          this.handleTabActive()
        }
      }
    },
	}
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/mixins';

  .result-table {
    position: relative;

    &.hidden-filter .table-search-wrapper {
      display: none;
    }

    &::v-deep:not(.hidden-filter) {
      .tabulator-tableholder {
        padding-bottom: 5rem;
      }
    }
  }

  .table-search-wrapper.table-filter {
    display: flex;
    padding: 0.8rem 1rem;
    justify-content: space-between;
    width: auto;
    position: absolute;
    bottom: 1rem;
    right: 1.5rem;
    z-index: 10;
    align-items: center;
    background-color: var(--query-editor-bg);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    @include card-shadow;

    .btn-fab {
      min-width: auto;
      width: 1.6rem;
      height: 1.5rem;
      margin-left: 0.4rem;

      &[type=submit] {
        margin-left: 0.75rem;
      }

      .material-icons {
        font-size: 1.2rem;
      }
    }
  }

  .input-wrapper {
    width: 17rem;
    position: relative;
    .clear {
      visibility: hidden;
      position: absolute;
      right: 0;
      top: 5px;
    }
    &:hover .clear {
      visibility: visible;
    }
  }
</style>
