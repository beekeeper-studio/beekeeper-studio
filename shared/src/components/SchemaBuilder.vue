<template>
  <div class="schema-builder">
    <div class="slot-wrapper">
      <slot></slot>
    </div>
    <div class="schema-header flex flex-middle">
      <h3 class="title">Columns</h3>
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
import { Dialect, SchemaItem } from '../lib/dialects/models'

interface SchemaBuilderData {
  builtColumns: SchemaItem[],
  tabulator: Tabulator
  defaultName: string
  columnsModified: boolean
}

export default Vue.extend({
  props: {
    initialColumns: Array as PropType<SchemaItem[]>,
    dialect: String as PropType<Dialect>,
    resetOnUpdate: Boolean as PropType<boolean>,
    disabled: Boolean as PropType<boolean>
  },
  data(): SchemaBuilderData {
    return {
      builtColumns: [],
      tabulator: null,
      defaultName: 'untitled_table',
      columnsModified: false
    }
  },
  watch: {
    initialColumns() {
      if (this.resetOnUpdate && this.initialColumns && this.tabulator) {
        this.tabulator.replaceData([...this.initialColumns])
        this.getData(false)
      }
    },
    dialect() {
      this.generator.dialect = this.dialect
      this.schemaChanges = 0
      this.tabulator.replaceData(this.builtColumns)
    },
    builtColumns: {
      deep: true,
      handler() {
        if (this.builtColumns && this.modified) {
          this.$emit('columnsChanged', this.builtColumns)
        }
      }
    }
  },
  computed: {
    editable(){
      return !this.disabled
    },
    modified(){
      return this.columnsModified
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
      const editable = this.editable
      const dataColumns = [
        {
          title: 'Name', 
          field: 'columnName',
          editor: vueEditor(NullableInputEditor),
          tooltip: true,
          editorParams: {
          }
        },
        {title: 'Type', field: 'dataType', editor: 'autocomplete', editorParams: this.autoCompleteOptions,  minWidth: 56,widthShrink:1},

        {
          title: 'Nullable',
          field: 'nullable',
          cssClass: "no-padding no-edit-highlight",
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter), 
          formatterParams: {
            editable
          },
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
          tooltip: true,
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
          tooltip: true,
          headerTooltip: "Leave a friendly comment for other database users about this column"
        },
        {
          title: 'Primary', field: 'primaryKey', 
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter), 
          formatterParams: {
            editable
          },
          width: 76,
          widthShrink:1,
          cssClass: "no-padding no-edit-highlight"
        },
      ]
      return editable ? [
        {rowHandle:true, formatter:"handle", width:30, frozen: true, minWidth:30, resizable: false, cssClass: "no-edit-highlight"},
        ...dataColumns,
        {
          formatter: trashButton, width: 36, minWidth: 36, hozAlign: 'center', cellClick: editable ? this.removeRow : undefined, resizable: false, cssClass: "remove-btn no-edit-highlight",
        }
      ] : dataColumns.map((c) => ({...c, editable}))
    },
  },

  methods: {
    getData(markModified: boolean = true) {
      this.builtColumns = this.tabulator.getData()
      this.columnsModified = markModified
    },
    removeRow(_e, cell: Tabulator.CellComponent) {
      this.tabulator.deleteRow(cell.getRow())
    },
    addRow() {
      this.tabulator.addRow({ columnName: 'untitled', dataType: 'text'})
    },
    cellEdited() {
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
    this.tabulator = new Tabulator(this.$refs.tabulator, {
      data: [...this.initialColumns],
      columns: this.tableColumns,
      movableRows: this.editable,
      headerSort: false,
      rowMoved: () => this.getData(),
      resizableColumns: false,
      columnMinWidth: 56,
      layout: 'fitColumns',
      dataChanged: () => this.getData()
    })
    this.getData(false)
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
            width: 80%;
            transform: rotate(90deg);
            margin-left: -8px;
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