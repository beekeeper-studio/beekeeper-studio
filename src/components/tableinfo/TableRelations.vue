<template>
  <div class="table-info-table">
    <h2>Relations</h2>
    <div class="table-relations" ref="tabulator">

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
      data: [{name: 'bar', to: 'city', column: 'city_id'}],
      autoColumns: true
    })
  }
}
</script>