<template>
  <div class="table-wrapper">
    <div ref="tabulator"></div>
    <div class="table-footer">
      <button class="btn btn-primary" @click.prevent="addRow">Add Field 🎠</button>
    </div>
  </div>
</template>
<style lang="scss" scoped>
  .table-wrapper {
    background-color: pink;
  }
</style>

<script lang="ts">
import Vue from 'vue'
import Tabulator from 'tabulator-tables'
import { getDialectData } from '../lib/dialects'
import tab from '../lib/tabulator'

export default Vue.extend({
  props: ['initialSchema', 'initialName', 'dialect'],
  data() {
    return {
      name: "untitled_table",
      schema: [],
      tabulator: null,
    }
  },

  computed: {
    autoCompleteOptions() {
      return {
        freetext: true,
        allowEmpty: false,
        values: getDialectData(this.dialect).columnTypes.map((d) => d.pretty),
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }
    },
    tableData() {
      return this.schema
    },
    tableColumns() {
      return [
        {rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},        {title: 'Name', field: 'columnName', editor: 'input', headerFilter: true},
        {title: 'Type', field: 'dataType', editor: 'autocomplete', editorParams: this.autoCompleteOptions},
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: 'select',
          editorParams: {
            values: [
              {label: "YES", value: true},
              {label: "NO", value: false}
            ]
          },
          formatter: this.yesNoFormatter,
        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: 'input',
          headerTooltip: "If you don't set a value for this field, this is the default value",
          formatter: this.cellFormatter
        },
        {title: 'Primary', field: 'primary', formatter: this.yesNoFormatter, formatterParams: { allowEmpty: true, falseEmpty: true}, editor: 'select',
          editorParams: {
            values: [
              {label: "YES", value: true},
              {label: "NO", value: false}
            ]
          },
        },
        {
          formatter: this.trashButton, width: 40, hozAlign: 'center', cellClick: this.removeRow
        }
      ]
    },
  },

  methods: {
    trashButton() {
      return '🗑'
    },
    removeRow(_e, cell: Tabulator.CellComponent) {
      this.tabulator.deleteRow(cell.getRow())
    },
    addRow() {
      this.tabulator.addRow({ columnName: 'untitled', dataType: 'text'})
    },
    cellEdited(c) {
      console.log('--> Cell edited!', c)
    },
    cellFormatter: tab.cellFormatter,
    yesNoFormatter: tab.yesNoFormatter
  },

  mounted() {
    if (this.initialSchema){
      this.schema = [...this.initialSchema]
    }
    if (this.initialName) this.name = this.initialName

    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: this.tableData,
      reactiveData: true,
      columns: this.tableColumns,
      movableRows: true,
      layout: 'fitDataFill'
    })
  }
})
</script>