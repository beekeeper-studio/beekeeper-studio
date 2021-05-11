<template>
  <div ref="tableSchema"></div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabID", "active", "primaryKey"],
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
    tableData: {
      deep: true,
      handler: () => {
        this.tabulator.replaceData(this.tableData)
      }
    }
  },
  computed: {
    tableColumns() {
      return [
        {title: 'Position', field: 'ordinalPosition'},
        {title: 'Name', field: 'columnName', editor: 'input'},
        {title: 'Type', field: 'dataType', editor: 'input'}, 
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: 'tickCross',
          formatter: 'tickCross'
        },
        {title: 'Default', field: 'defaultValue', editor: 'input', headerTooltip: "If you don't set a value for this field, this is the default value"},
        {title: 'Primary', field: 'primary', editor: 'tickCross', formatter: 'tickCross'},
      ]
    },
    tableData() {
      return this.table.columns.map((c) => {
        return { primary: c.columnName === this.primaryKey, ...c}
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