<template>
  <div class="table-info-table view-only">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <div class="table-subheader">
          <div class="table-title">
            <h2>Relations</h2>
          </div>
          <div class="table-actions">
            <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Relation</a> -->
          </div>
        </div>
        <div class="table-relations" ref="tabulator"></div>
      </div>
    </div>
    
    <div class="expand" />

    <status-bar class="tabulator-footer">
      <div class="flex flex-middle flex-right statusbar-actions">
        <slot name="footer" />
        <slot name="actions" />
      </div>
    </status-bar>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import globals from '../../common/globals'
import StatusBar from '../common/StatusBar.vue'
export default {
  props: ["table", "connection", "tabId", "active", "properties"],
  components: {
    StatusBar
  },
  data() {
    return {
      tabulator: null
    }
  },
  computed: {
    tableColumns() {
      return [
        { field: 'constraintName', title: "Name", widthGrow: 2},
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
      placeholder: "No Relations",
      layout: 'fitColumns'

    })
  }
}
</script>