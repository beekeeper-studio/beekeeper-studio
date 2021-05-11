<template>
  <div class="table-triggers">
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabId", "active"],
  data() {
    return {
      tableTriggers: null
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
    this.tableTriggers = new Tabulator(this.$refs.tableTriggers, {
      columns: this.tableColumns,
      data: this.tableData
    })
  }
}
</script>