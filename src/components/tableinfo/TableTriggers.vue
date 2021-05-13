<template>
  <div class="table-info-triggers">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Triggers</h2>
      </div>
      <div class="table-actions">
        <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Row</a>
      </div>
    </div>
    <div class="card-flat">
      <div class="table-triggers" ref="tabulator">
      </div>
    </div>
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
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: [{name: 'bar', to: 'city', column: 'city_id'}],
      autoColumns: true
    })
  }
}
</script>