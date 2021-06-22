<template>
  <div class="schema-builder">
    <div class="table-header flex flex-middle">
      <h2 class="expand"><input type="text" v-model="name" placeholder="defaultName"></h2>
      <dialect-picker :confirm="schemaChanges > 0" :confirmMessage="confirmMessage"/>
    </div>
    <div class="schema-header flex flex-middle">
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
import DialectPicker from '@/components/DialectPicker.vue'
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
  components: {
    DialectPicker,
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
      this.generator.dialect = this.dialect
      this.schemaChanges = 0
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
    dialectWarning() {
      return dialectNotes[this.dialect]
    },
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
          cssClass: "no-padding no-edit-highlight"
        },
        {
          formatter: trashButton, width: 36, minWidth: 36, hozAlign: 'center', cellClick: this.removeRow, resizable: false, cssClass: "remove-btn no-edit-highlight",
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
  @import '@shared/assets/styles/_variables';
  @import '@shared/assets/styles/_extends';

  $row-height:             42px;
  $min-cell-width:         24px;
  $cell-font-size:         14px;
  $cell-padding:           0.6rem;
  $btn-fab-size:           32px;

  .schema-builder {

    // Table Header
    .table-header {
      margin: 0 (-$gutter-h * 1.25) ($gutter-w * 2);
      h2 {
        margin: 0;
        input {
          font-size: 1.6rem;
          border: 0;
          height: auto;
          line-height: 1.6;
          &:hover, &:focus {
            background: rgba($theme-base, 0.035);
          }
        }
      }
      select {
        margin-left: $gutter-w;
      }
    }
    
    // Schema Header
    .schema-header {
      margin-bottom: $gutter-h;
      padding: 0 ($gutter-h * 0.5);
      .btn-fab {
        width: $btn-fab-size;
        height: $btn-fab-size;
        min-width: $btn-fab-size;
      }
      .table-title {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.95rem;
        color: $text-light;
      }
    }

    .tabulator,
    .tabulator .tabulator-tableHolder {
      overflow: visible;
      max-width: 100%;
    }

    // Tabulator Header Row
    .tabulator {
      .tabulator-header {
        box-shadow: none;
        padding: 0!important;
        .tabulator-col {
          min-width: $min-cell-width!important;
          padding: 0 $cell-padding;
          font-size: ($cell-font-size * 0.9);
          .tabulator-col-content {
            padding: 0;
            .tabulator-col-title {
              color: $text-lighter;
            }
          }
        }
      }
    }

    // Field Rows
    .tabulator-row {
      margin: 4px 0;
      background: rgba($theme-base, 0.05);
      border-radius: 5px;
      overflow: hidden;
      &.tabulator-row-even,
      &:nth-child(odd) {
        background: rgba($theme-base, 0.05);
      }
      .tabulator-cell {
        min-height: $row-height;
        height: $row-height;
        line-height: $row-height + 2px;
        padding: 0 $cell-padding;
        min-width: $min-cell-width;
        font-size: $cell-font-size;
        color: $text-dark;
        flex-grow: 1;
        &.tabulator-editing {
          border: 0;
          padding: 0 $gutter-h;
          min-height: $row-height;
          height: $row-height;
          line-height: $row-height + 2px;
          box-shadow: inset 0 1px $theme-base;
          .nullible-input {
            padding-right: 18px!important;
          }
        }
        &.no-padding {
          padding: 0;
          > * {
            margin: 0 $cell-padding;
          }
        }
        &.no-edit-highlight {
          background: transparent!important;
          &.tabulator-editing {
            box-shadow: none!important;
            input {
              box-shadow: inset 0 0 0 2px rgba($theme-base,0.87);
              &[type="checkbox"]:active, 
              &[type="checkbox"]:checked, 
              &[type="checkbox"]:checked:active {
                background: $theme-base!important;
                color: rgba(black, 0.87)!important;
                box-shadow: none!important;
              }
            }
          }
          &:hover {
            background: transparent;
          }
        }

        // Remove Cell
        &.remove-btn {
          padding: 0;
          cursor: default;
          .material-icons {
            line-height: $row-height;
            cursor: pointer;
            color: $text-lighter;
            transition: color 0.2s ease-in-out;
            &:hover {
              color: $text-dark;
            }
          }
        }

        // Make checkboxes behave correctly
        .tabulator-bks-checkbox {
          display: flex;
          align-items: center;
          height: $row-height;
          input {
            height: 18px;
            padding: 0!important;
          }
        }

        input, textarea {
          height: $row-height;
        }
        .null-value {
          color: $text-lighter;
        }
      }
    }

    
    // Resize Handle
    .tabulator-header,
    .tabulator-row {
      .tabulator-frozen, .tabulator-frozen:hover {
        background: transparent!important;
        border: 0!important;
        padding: 0!important;
      }
    }
    .tabulator-row {
      padding: 0!important;
      .tabulator-frozen {
        position: relative!important;
        cursor: move;
        &.tabulator-row-handle {
          .tabulator-row-handle-box {
            width: 78%;
            transform: rotate(90deg);
            margin-left: -12px;
            .tabulator-row-handle-bar {
              background: $border-color;
              height: 1px;
              &:last-child {
                display: none;
              }
            }
          }
        }
      }
    }

    .tabulator-row {
      &.tabulator-moving {
        @extend .card-shadow-hover;
        border: 0;
        background: lighten($theme-bg, 15%);
      }
    }
  }
</style>