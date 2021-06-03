<template>
<div class="table-info-table">
  <div class="table-subheader">
    <div class="table-title">
      <h2>Indexes</h2>
    </div>
    <div class="table-actions">
      <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Index</a> -->
    </div>
  </div>
  <div class="card-flat">
    <div class="table-indexes" ref="tabulator"></div>
  </div>
</div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import data_mutators from '../../mixins/data_mutators'
import globals from '../../common/globals'
export default {
  mixins: [data_mutators],
  props: ["table", "connection", "tabId", "active", "properties"],
  data() {
    return {
      tabulator: null
    }
  },
  watch: {
    tableData() {
      if (!this.tabulator) return
      this.tabulator.replaceData(this.tableData)
    }
  },
  computed: {
    tableData() {
      return this.properties.indexes || []
    },
    tableColumns() {
      return [
        {title: 'Id', field: 'id'},
        {title:'Name', field: 'name'},
        {title: 'Unique', field: 'unique', formatter: this.yesNoFormatter},
        {title: 'Primary', field: 'primary', formatter: this.yesNoFormatter},
        {title: 'Columns', field: 'columns'}
      ]
    }
  },
  mounted() {
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: this.tableData,
      columns: this.tableColumns,
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Indexes"
    })
  }
}
</script>