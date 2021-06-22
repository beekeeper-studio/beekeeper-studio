<template>
  <div class="schema-builder">
    <h2><input type="text" v-model="name" placeholder="defaultName"></h2>
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
import {vueEditor, vueFormatter} from '../lib/tabulator/helpers'
import NullableInputEditor from './tabulator/NullableInputEditor.vue'
import CheckboxEditor from './tabulator/CheckboxEditor.vue'
import CheckboxFormatter from './tabulator/CheckboxFormatter.vue'
import { Dialect, SchemaItem, Schema } from '../lib/dialects/models'

interface SchemaBuilderData {
  builtColumns: SchemaItem[],
  name: string,
  tabulator: Tabulator
  defaultName: string
}

export default Vue.extend({
  props: {
    initialSchema: Object as PropType<Schema>,
    dialect: String as PropType<Dialect>,
    resetOnUpdate: Boolean as PropType<boolean>
  },
  data(): SchemaBuilderData {
    return {
      name: "untitled_table",
      builtColumns: [],
      tabulator: null,
      defaultName: 'untitled_table',
    }
  },
  watch: {
    initialSchema() {
      if (this.resetOnUpdate && this.initialSchema && this.tabulator) {
        this.tabulator.replaceData([...this.initialSchema.columns])
      }
    },
    dialect() {
      this.tabulator.replaceData(this.schema)
    },
    schema: {
      deep: true,
      handler() {
        if (this.schema) {
          this.$emit('schemaChanged', this.schema)
        }
      }
    }
  },
  computed: {
    schema(): Schema {
      return {
        name: this.name,
        columns: this.builtColumns
      }
    },
    autoCompleteOptions() {
      return {
        freetext: true,
        allowEmpty: false,
        values: getDialectData(this.dialect).columnTypes.map((d) => d.pretty),
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }
    },
    tableColumns() {
      const trashButton = () => '<i class="material-icons" title="remove">clear</i>'
      return [
        {rowHandle:true, formatter:"handle", width:30, frozen: true, minWidth:30, resizable: false, cssClass: "no-edit-highlight"},
        {title: 'Name', field: 'columnName', editor: 'input'},
        {title: 'Type', field: 'dataType', editor: 'autocomplete', editorParams: this.autoCompleteOptions,  minWidth: 56,widthShrink:1},

        {
          title: 'Nullable',
          field: 'nullable',
          cssClass: "no-padding no-edit-highlight",
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter), 
          width: 76,
          widthShrink:1
        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditor),
          editorParams: {
            allowEmpty: false
          },
          headerTooltip: "The default value of this field. Be sure to add quotes around literal values - eg 'my value'",
          formatter: this.cellFormatter,
          widthShrink:1
        },
        {
          title: 'Comment',
          field: 'comment',
          formatter: this.cellFormatter,
          editor: vueEditor(NullableInputEditor),
          widthShrink:1,
          headerTooltip: "Leave a friendly comment for other database users about this column"
        },
        {
          title: 'Primary', field: 'primaryKey', 
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter), 
          width: 76,
          widthShrink:1,
        },
        {
          formatter: trashButton, width: 30, minWidth: 30, hozAlign: 'center', cellClick: this.removeRow, resizable: false, cssClass: "no-edit-highlight",
        }
      ]
    },
  },

  methods: {
    rowMoved() {
      this.builtColumns = this.tabulator.getData()
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
    this.name = this.initialSchema.name || 'untitled_table'
    this.builtColumns = [...this.initialSchema.columns]

    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: [...this.initialSchema.columns],
      columns: this.tableColumns,
      movableRows: true,
      headerSort: false,
      rowMoved: this.rowMoved,
      resizableColumns: false,
      columnMinWidth: 56,
      layout: 'fitColumns',
      dataChanged: (data) => {
        this.builtColumns = data
      }
    })
  }
})
</script>


<style lang="scss">
  @import '@shared/assets/styles/components/schema-builder';
</style>