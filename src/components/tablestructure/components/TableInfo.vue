<template>
  <div class="table-info">
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabId", "active"],
  data() {
    return {
      tableInfo: null
    }
  },
  computed: {
    tableColumns() {
      return [{ title: 'name', field: 'name'}, {title:'type', field: 'type'}]
    },
    tableData() {
      return this.table.columns.map((c) => {
        return {name: c.columnName, type: c.dataType}
      })
    },
  },
  mounted() {
    this.tableInfo = new Tabulator(this.$refs.tableInfo, {
      columns: this.tableColumns,
      data: this.tableData
    })
  }
}
</script>