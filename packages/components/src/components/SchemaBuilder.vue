<template>
  <div class="table-wrapper">
    <div class="table-header flex flex-middle">
      <slot></slot>
      <span class="expand"></span>
      <button class="btn btn-primary" @click.prevent="addRow">Add Field</button>
    </div>
    <div class="card-flat">
      <div ref="tabulator"></div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Tabulator from 'tabulator-tables'
import { getDialectData } from '../lib/dialects'
import tab from '../lib/tabulator'
import {vueEditor} from '../lib/tabulator/helpers'
import NullableInputEditor from './tabulator/NullableInputEditor.vue'

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
        {rowHandle:true, formatter:"handle", frozen:true, width:30, minWidth:30, resizable: false},
        {title: 'Name', field: 'columnName', editor: 'input'},
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
          editor: vueEditor(NullableInputEditor),
          editorParams: {
            allowEmpty: false,
            placeholder: '(NULL)'
          },
          headerTooltip: "If you don't set a value for this field, this is the default value",
          formatter: this.cellFormatter,
        },
        {title: 'Primary', field: 'primary', formatter: this.yesNoFormatter, formatterParams: { allowEmpty: true, falseEmpty: true}, editor: 'select',
          editorParams: {
            values: [
              {label: "YES", value: true},
              {label: "NO", value: false}
            ],
          },
        },
        {
          formatter: this.trashButton, width: 40, hozAlign: 'center', cellClick: this.removeRow, resizable: false
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
  beforeDestroy() {
    if (this.tabulator) {
      this.tabulator.destroy()
    }
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
      layout: 'fitDataFill',
      headerSort: false,
    })
  }
})
</script>

<style lang="scss" scoped>

</style>