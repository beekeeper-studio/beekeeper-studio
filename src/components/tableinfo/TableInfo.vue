<template>
  <div class="view-table-info">
    <h1>{{table.name}} Something Something</h1>
    <div class="schema-wrapper">
      <div ref="schemaTable"></div>
    </div>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabId", "active"],
  data() {
    return {
      schemaTable: null

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
    this.schemaTable = new Tabulator(this.$refs.schemaTable, {
      columns: this.tableColumns,
      data: this.tableData
    })
  }
}
</script>