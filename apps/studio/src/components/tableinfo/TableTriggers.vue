<template>
  <div class="table-info-table view-only">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <div
          class="notices"
          v-if="notice"
        >
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>{{ notice }}</div>
          </div>
        </div>
        <div class="table-subheader">
          <div class="table-title">
            <h2>Triggers</h2>
          </div>
          <div class="table-actions">
            <!-- <a class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Trigger</a> -->
          </div>
        </div>
        <div
          class="table-triggers"
          ref="tabulator"
        />
      </div>
    </div>

    <div class="expand" />

    <status-bar class="tabulator-footer" :active="active">
      <div class="flex flex-middle flex-right statusbar-actions">
        <slot name="footer" />
        <slot name="actions" />
      </div>
    </status-bar>
  </div>
</template>
<script>
import {Tabulator, TabulatorFull} from 'tabulator-tables'
import data_mutators from '../../mixins/data_mutators'
import StatusBar from '../common/StatusBar.vue'
import { mapGetters, mapState } from 'vuex'
import { SelectableCellMixin } from '@/mixins/selectableCell';


export default {
  components: {
    StatusBar,
  },
  mixins: [data_mutators, SelectableCellMixin],
  props: ["table", "tabId", "active", "properties"],
  data() {
    return {
      tableTriggers: null
    }
  },
  computed: {
    ...mapState(['connectionType']),
    ...mapGetters(['dialectData']),
    notice() {
      return this.dialectData.notices?.infoTriggers;
    },
    tableColumns() {
      return this.connectionType === 'sqlite' ?
        this.sqliteTableColumns : this.normalTableColumns
    },
    sqliteTableColumns() {
      return [
        { field: 'name', title: 'Name', tooltip: true, cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)},
        { field: 'sql', title: 'SQL', tooltip: true, cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)}
      ]
    },
    normalTableColumns() {
      return [
        { field: 'name', title: "Name", tooltip: true, cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)},
        { field: 'timing', title: "Timing", cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)},
        { field: 'manipulation', title: "Manipulation", cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)},
        { field: 'action', title: "Action", tooltip: true, widthGrow: 2.5, cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)},
        { field: 'condition', title: "Condition", formatter: this.cellFormatter, cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)}
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
    this.tabulator = new TabulatorFull(this.$refs.tabulator, {
      columns: this.tableColumns,
      data: this.tableData,
      height: 'auto',
      columnDefaults: {
        tooltip: true,
        headerSort: true,
        maxInitialWidth: this.$bksConfig.ui.tableTriggers.maxColumnWidth,
      },
      placeholder: "No triggers",
      layout: 'fitColumns'


    })
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>
