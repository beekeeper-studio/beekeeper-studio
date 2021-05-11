<template>
  <div ref="tableSchema"></div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import _ from 'lodash'
export default {
  props: ["table", "connection", "tabID", "active", "primaryKeys", 'columnTypes'],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false
    }
  },
  watch: {
    active() {
      if (!this.tabulator) return;
      if (this.active) {
        this.tabulator.restoreRedraw()
        this.$nextTick(() => {
          this.tabulator.redraw(this.forceRedraw)
          this.forceRedraw = false
        })
      } else {
        this.tabulator.blockRedraw()
      }
    },
    tableData: () => {
      if (!this.tabulator) return
      this.tabulator.replaceData(this.tableData)
    }
  },
  computed: {
    tableColumns() {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }
      return [
        {title: 'Position', field: 'ordinalPosition', headerTooltip: 'The ordinal position of the columns'},
        {title: 'Name', field: 'columnName', editor: 'input'},
        {title: 'Type', field: 'dataType', editor: 'autocomplete', editorParams: autocompleteOptions}, 
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: 'tickCross',
          formatter: 'tickCross'
        },
        {title: 'Default', field: 'defaultValue', editor: 'input', headerTooltip: "If you don't set a value for this field, this is the default value"},
        {title: 'Primary', field: 'primary'},
      ]
    },
    tableData() {
      const keys = _.keyBy(this.primaryKeys, 'columnName')
      return this.table.columns.map((c) => {
        const key = keys[c.columnName]
        return { 
          primary: key ? key.position : null,
          ...c
        }
      })
    },
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    if (!this.active) this.forceRedraw = true
    this.tabulator = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableColumns,
      data: this.tableData,
      height: this.actualTableHeight,
      // width: columnWidth,
    })
  }
}
</script>