<template>
  <div ref="tableSchema"></div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabID", "active"],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
    }
  },
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
  },
  computed: {
    tableColumns() {
      return [
        {title: 'Field', field: 'field'}, 
        {title: 'Type', field: 'type'}, 
        {title: 'Nullable', field: 'allowNull', headerTooltip: "Allow this column to contain a null value"},
        {title: 'Default', field: 'defaultValue', headerTooltip: "If you don't set a value for this field, this is the default value"},
        {title: 'Unsigned', field: 'unsigned'},
          {title: 'Zerofill', field: 'zerofill'},
        {title: 'Binary', field: 'binary'},
        {title: 'Key', field: 'key'},
        {title: 'Definition', field: 'definition'},
        {title: 'Extra', field: 'extra'},
        {title: 'Encoding', field: 'encoding'},
      ]
    },
    tableData() {
      return this.table.columns.map((c) => {
        return {field: c.columnName, type: c.dataType}
      })
    },
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    this.tabulator = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableColumns,
      data: this.tableData,
      height: this.actualTableHeight,
      // width: columnWidth,
    })
  }
}
</script>