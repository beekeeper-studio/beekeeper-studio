<template>
<div class="table-info-table">
  <div class="table-subheader">
    <div class="table-title">
      <h2>Indexes</h2>
    </div>
    <div class="table-actions">
      <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Index</a>
    </div>
  </div>
  <div class="card-flat">
    <div class="table-indexes" ref="tabulator"></div>
  </div>
</div>
</template>
<script>
import Tabulator from 'tabulator-tables'
export default {
  props: ["table", "connection", "tabId", "active"],
  data() {
    return {
      tabulator: null

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
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: [{name: "foo", columns: "a,b,c"}],
      autoColumns: true
    })
  }
}
</script>