<template>
  <div class="table-info-tablet">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Relations</h2>
      </div>
      <div class="table-actions">
        <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Relation</a> -->
      </div>
    </div>
    <div class="card-flat">
      <div class="table-relations" ref="tabulator"></div>
    </div>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import globals from '../../common/globals'
export default {
  props: ["table", "connection", "tabId", "active", "properties"],
  data() {
    return {
      tabulator: null
    }
  },
  computed: {
    tableColumns() {
      return [
        { field: 'constraintName', title: "Name"},
        { field: 'fromColumn', title: "Column"},
        { field: 'toSchema', title: "FK Schema"},
        { field: 'toTable', title: "FK Table"},
        { field: 'toColumn', title: "FK Column"},
        { field: 'onUpdate', title: "On Update"},
        { field: 'onDelete', title: 'On Delete'}
      ]
    },
    tableData() {
      return this.properties.relations || []
    },
  },
  watch: {
    tableData() {
      if (this.tabulator) this.tabulator.replaceData(this.tableData)
    }
  },
  mounted() {
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      columns: this.tableColumns,
      data: this.tableData,
      tooltips: true,
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Relations"
    })
  }
}
</script>