<template>
  <div class="table-info-table view-only">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <div class="table-subheader">
          <div class="table-title">
            <h2>Indexes</h2>
          </div>
          <div class="table-actions">
            <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Index</a> -->
          </div>
        </div>
        <div class="table-indexes" ref="tabulator"></div>
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
import data_mutators from '../../mixins/data_mutators'
import globals from '../../common/globals'
import { vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import StatusBar from '../common/StatusBar.vue'
export default {
  components: {
    StatusBar,
  },
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
        {title: 'Id', field: 'id', widthGrow: 0.5},
        {title:'Name', field: 'name'},
        {title: 'Unique', field: 'unique', formatter: vueFormatter(CheckboxFormatterVue), width: 80},
        {title: 'Primary', field: 'primary', formatter: vueFormatter(CheckboxFormatterVue), width: 85},
        {title: 'Columns', field: 'columns'}
      ]
    }
  },
  mounted() {
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: this.tableData,
      columns: this.tableColumns,
      layout: 'fitColumns',
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Indexes"
    })
  }
}
</script>