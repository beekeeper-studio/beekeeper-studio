<template>
  <div ref="tableSchema"></div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabID", "active"],
  data() {
    return {
      tableSchema: null,
      actualTableHeight: "100%",
    }
  },
  computed: {
    tableColumns() {
      return [
        {title: 'Field', field: 'field'}, 
        {title: 'Type', field: 'type'}, 
        {title: 'Length', field: 'length'},
        {title: 'Unsigned', field: 'unsigned'},
        {title: 'Zerofill', field: 'zerofill'},
        {title: 'Binary', field: 'binary'},
        {title: 'Allow Null', field: 'allowNull'},
        {title: 'Key', field: 'key'},
        {title: 'Definition', field: 'definition'},
        {title: 'Extra', field: 'extra'},
        {title: 'Encoding', field: 'encoding'},
      ]
    },
    tableData() {
      return this.table.columns.map((c) => {
        return {name: c.columnName, type: c.dataType}
      })
    },
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    this.tableSchema = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableColumns,
      data: this.tableData,
      height: this.actualTableHeight,
      // width: columnWidth,
    })
  }
}
</script>