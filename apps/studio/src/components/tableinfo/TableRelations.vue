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
<script lang="ts">
import Vue from 'vue'
import Tabulator, { CellComponent, ColumnDefinition } from 'tabulator-tables'
import globals from '../../common/globals'
import StatusBar from '../common/StatusBar.vue'
import { vueEditor } from '@shared/lib/tabulator/helpers'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
export default Vue.extend({
  props: ["table", "connection", "tabId", "active", "properties"],
  components: {
    StatusBar
  },
  data() {
    return {
      tabulator: null,
      newRows: [],
      removedRows: [],
      error: null
    }
  },
  computed: {
    tableColumns(): ColumnDefinition[] {
      const editable = (cell) => this.newRows.includes(cell.getRow()) && !this.loading

      return [
        { 
          field: 'constraintName',
          title: "Name",
          widthGrow: 2,
          editable,
          editor: vueEditor(NullableInputEditorVue),

        },
        { 
          field: 'fromColumn',
          title: "Column",
          editable,
          editor: 'select',
          editorParams: {
            values: this.table.columns.map((c) => c.columnName)
          }
        },
        { 
          field: 'toSchema',
          title: "FK Schema",
          editable,
          editor: vueEditor(NullableInputEditorVue)
        },
        { 
          field: 'toTable',
          title: "FK Table",
          editable,
          editor: vueEditor(NullableInputEditorVue)
          
        },
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
  methods: {
    isCellEditable(cell: CellComponent): boolean {
      return this.newRows.includes(cell.getRow())
    }
  },
  mounted() {
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      columns: this.tableColumns,
      data: this.tableData,
      tooltips: true,
      placeholder: "No Relations",
      layout: 'fitColumns'

    })
  }
})
</script>