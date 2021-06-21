<template>
  <div class="schema-builder">
    <div class="table-header flex flex-middle">
      <slot></slot>
      <span class="expand"></span>
      <button class="btn btn-primary btn-fab" @click.prevent="addRow" title="Add Field"><i class="material-icons">add</i></button>
    </div>
    <div ref="tabulator"></div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import Tabulator from 'tabulator-tables'
import { getDialectData } from '../lib/dialects'
import tab from '../lib/tabulator'
import {vueEditor} from '../lib/tabulator/helpers'
import NullableInputEditor from './tabulator/NullableInputEditor.vue'
import CheckboxEditor from './tabulator/CheckboxEditor.vue'
import { Dialect, SchemaItem } from '../lib/dialects/models'
import checkboxFormatter from '../lib/tabulator/formatters/CheckboxFormatter'

interface SchemaBuilderData {
  schema: SchemaItem[],
  name: string,
  tabulator: Tabulator
}

export default Vue.extend({
  props: {
    initialName: String,
    initialSchema: Array as PropType<SchemaItem[]>,
    dialect: String as PropType<Dialect>,
    resetOnUpdate: Boolean as PropType<boolean>
  },
  data(): SchemaBuilderData {
    return {
      name: "untitled_table",
      schema: [],
      tabulator: null,
    }
  },
  watch: {
    initialSchema() {
      if (this.resetOnUpdate) {
        this.initializeSchema()
      }
    },
    schema: {
      deep: true,
      handler() {
        if (this.schema) {
          this.tabulator.replaceData(this.schema)
          this.$emit('schemaChanged', this.schema)
        }
      }
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
          editor: vueEditor(CheckboxEditor),
          // formatter: vueEditor(CheckboxEditor),
          // cellClick: (e, cell) => cell.setValue(!cell.getValue(), true),
          // editor: true,
          formatter: 'tickCross',
          // formatter: checkboxFormatter,
          widthShrink: 1,

        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditor),
          editorParams: {
            allowEmpty: false
          },
          headerTooltip: "If you don't set a value for this field, this is the default value",
          formatter: this.cellFormatter,
        },
        {
          title: 'Special',
          field: 'special',
          formatter: this.cellFormatter,
          editor: 'input'
        },
        {title: 'Primary', field: 'primaryKey', formatter: this.yesNoFormatter, formatterParams: { allowEmpty: true, falseEmpty: true}, editor: 'select',
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
    rowMoved(row, ...args) {
      this.schema = this.tabulator.getData()
    },
    initializeSchema() {
      if (this.initialSchema){
        this.schema = [...this.initialSchema]
      }
    },
    trashButton() {
      return '<i class="material-icons" title="remove">clear</i>'
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
    this.initializeSchema()

    if (this.initialName) this.name = this.initialName

    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: this.tableData,
      reactiveData: false,
      columns: this.tableColumns,
      movableRows: true,
      layout: 'fitColumns',
      headerSort: false,
      rowMoved: this.rowMoved,
      dataChanged: (data) => this.schema = data
    })
  }
})
</script>

<style lang="scss">
  @import '@shared/assets/styles/components/schema-builder';
</style>