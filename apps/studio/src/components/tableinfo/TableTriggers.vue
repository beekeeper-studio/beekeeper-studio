<template>
  <div class="table-info-triggers">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Triggers</h2>
      </div>
      <div class="table-actions">
        <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Trigger</a> -->
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
import data_mutators from '../../mixins/data_mutators'
import globals from '../../common/globals'
export default {
  mixins: [data_mutators],
  props: ["table", "connection", "tabId", "active", "properties"],
  data() {
    return {
      tableTriggers: null
    }
  },
  computed: {
    tableColumns() {
      return this.connection.connectionType === 'sqlite' ?
        this.sqliteTableColumns : this.normalTableColumns
    },
    sqliteTableColumns() {
      return [
        { field: 'name', title: 'Name', tooltip: true},
        { field: 'sql', title: 'SQL', tooltip: true}
      ]
    },
    normalTableColumns() {
      return [
        { field: 'name', title: "Name", tooltip: true},
        { field: 'timing', title: "Timing"},
        { field: 'manipulation', title: "Manipulation"},
        { field: 'action', title: "Action", tooltip: true, maxInitialWidth: 500},
        { field: 'condition', title: "Condition", formatter: this.cellFormatter}
      ]
    },
    tableData() {
      return this.properties.triggers || []
    },
  },
  watch : {
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
      placeholder: "No triggers"

    })
  }
}
</script>