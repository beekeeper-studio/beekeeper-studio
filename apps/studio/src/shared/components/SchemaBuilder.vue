<template>
  <div class="schema-builder">
    <div class="slot-wrapper">
      <slot />
    </div>
    <div class="schema-header flex flex-middle">
      <h3 class="title">
        Columns
      </h3>
      <span class="expand" />
      <a
        class="btn btn-primary btn-icon"
        @click.prevent="addRow"
        title="Add Field"
      ><i class="material-icons">add</i></a>
    </div>
    <div
      id="tabulator-goes-here"
      ref="tabulator"
    />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { TabulatorFull, Tabulator, CellComponent, RowComponent } from 'tabulator-tables'
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
    disabled: Boolean as PropType<boolean>,
    initialEmit: Boolean as PropType<boolean>,
    tableHeight: {
      type: String,
      default: 'auto'
    }
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
    async initialColumns() {
      if (this.resetOnUpdate && this.initialColumns && this.tabulator) {
        await this.tabulator.replaceData([...this.initialColumns])
        this.getData(!!this.initialEmit)
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
      const { defaultColumnType, columnTypes } = getDialectData(this.dialect)
      return {
        freetext: true,
        allowEmpty: false,
        values: columnTypes.map((d) => d.pretty),
        defaultValue: defaultColumnType || 'varchar(255)',
        listOnEmpty: true,
        autocomplete: true,
      }
    },
    disabledFeatures() {
      return getDialectData(this.dialect).disabledFeatures
    },
    tableColumns() {
      const trashButton = () => '<i class="material-icons" title="remove">clear</i>'
      const editable = this.editable
      const dataColumns = [
        {
          title: 'Name',
          field: 'columnName',
          editor: vueEditor(NullableInputEditor),
          formatter: this.cellFormatter,
          tooltip: true,
          // frozen: true,
          minWidth: 100,
          editorParams: {
          }
        },
        {
          title: "Type",
          field: "dataType",
          editor: "list",
          editorParams: this.autoCompleteOptions,
          minWidth: 90,
          widthShrink: 1,
        },
        (this.disabledFeatures?.nullable) ? null :{
          title: 'Nullable',
          field: 'nullable',
          cssClass: "no-padding no-edit-highlight",
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter),
          formatterParams: {
            editable
          },
          width: 68,
          maxWidth: 68,
          widthShrink: 1,
        },
        (this.disabledFeatures?.defaultValue) ? null : {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditor),
          editorParams: {
            allowEmpty: false
          },
          tooltip: true,
          headerTooltip: "The default value of this field. Be sure to add quotes around literal values - eg 'my value'",
          formatter: this.cellFormatter,
          widthShrink: 1,
          minWidth: 100,
        },
        // TODO (Fix this)
        // right now we don't support mysql's EXTRA field. But creating an auto_increment
        // column is still possible. using the autoincrement column type.
        // (
        //   this.disabledFeatures?.informationSchema?.extra ? null : {
        //     title: "Extra",
        //     field: 'extra',
        //     editor: vueEditor(NullableInputEditor),
        //     tooltip: true,
        //     headerTooltip: "EG AUTO_INCREMENT",
        //     formatter: this.cellFormatter,
        //     widthShrink: 1,
        //   }
        // ),
        this.disabledFeatures?.comments
          ? null
          : {
              title: "Comment",
              field: "comment",
              formatter: this.cellFormatter,
              editor: vueEditor(NullableInputEditor),
              widthShrink: 1,
              tooltip: true,
              headerTooltip:
                "Leave a friendly comment for other database users about this column",
              minWidth: 100,
            },
        {
          title: 'Primary', field: 'primaryKey',
          editor: vueEditor(CheckboxEditor),
          formatter: vueFormatter(CheckboxFormatter),
          formatterParams: {
            editable
          },
          width: 68,
          maxWidth: 68,
          widthShrink:1,
          cssClass: "no-padding no-edit-highlight"
        },
      ].filter((c) => !!c)
      return editable ? [
        {rowHandle:true, formatter:"handle", width:30, frozen: true, minWidth:30, resizable: false},
        ...dataColumns,
        {
          formatter: trashButton, width: 36, minWidth: 36, hozAlign: 'center', cellClick: editable ? this.removeRow : undefined, resizable: false, cssClass: "remove-btn no-edit-highlight",
        }
      ] : dataColumns.map((c) => ({...c, editable}))
    },
  },

  methods: {
    getData(markModified = true) {
      const data = this.tabulator.getData()
      this.builtColumns = data
      this.columnsModified = markModified
    },
    removeRow(_e, cell: CellComponent) {
      this.tabulator.deleteRow(cell.getRow())
    },
    async addRow() {

      const num = this.tabulator.getData().length + 1
      const columnName = `column_${num}`
      const defaultDataType = getDialectData(this.dialect).defaultColumnType || 'varchar(255)'

      const row: RowComponent = await this.tabulator.addRow({ columnName, dataType: defaultDataType, nullable: true})
      const nameCell = row.getCell('columnName')
      if (nameCell){
        // don't know why we need this, but we do.
        setTimeout(() => nameCell.edit(), 50)
      }
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
    const initial = [...this.initialColumns]
    this.tabulator = new TabulatorFull(this.$refs.tabulator, {
      data: initial,
      columns: this.tableColumns,
      movableRows: this.editable,
      columnDefaults: {
        title: '',
        resizable: false,
        minWidth: 56,
        headerSort: false
      },
      layout: 'fitColumns',
      height: this.tableHeight
    })
    // this.getData(!!this.initialEmit)
    this.tabulator.on('tableBuilt', () => this.getData(!!this.initialEmit))
    this.tabulator.on('dataChanged', () => this.getData())
    this.tabulator.on('rowMoved', () => this.getData())

  }
})
</script>


<style lang="scss">
  @import '../../shared/assets/styles/_variables';
  @import '../../shared/assets/styles/_extends';
  $row-height:             42px;
  $min-cell-width:         24px;
  $cell-font-size:         14px;
  $cell-padding:           0.6rem;
  $btn-icon-size:           32px;

  .schema-builder {

    // Schema Header
    .schema-header {
      margin-bottom: $gutter-h;
      padding: 0 ($gutter-h * 0.5);
      .btn-icon {
        width: $btn-icon-size;
        height: $btn-icon-size;
        min-width: $btn-icon-size;
      }
      .table-title {
        margin: 0;
        text-transform: uppercase;
        font-size: 0.95rem;
        color: var(--text-muted);
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
        position: sticky;
        top: 0;
        z-index: 15;
        box-shadow: none!important;
        padding: 0!important;
        .tabulator-header-contents {
          background: var(--editor-bg);
        }
        .tabulator-col {
          min-width: $min-cell-width!important;
          padding: 0 $cell-padding;
          font-size: ($cell-font-size * 0.9);
          .tabulator-col-content {
            padding: 0!important;
            .tabulator-col-title {
              color: var(--text-muted);
            }
          }
        }
      }
    }

    .tabulator .tabulator-tableholder .tabulator-table {
      background-color: transparent;
    }

    // Field Rows
    .tabulator-row {
      margin: 4px 0;
      border-radius: 5px;
      --table-row-odd-bg: transparent;
      --table-row-even-bg: var(--bg-subtle-a);
      .tabulator-cell {
        min-height: $row-height;
        height: $row-height;
        line-height: $row-height;
        padding: 0 $cell-padding;
        min-width: $min-cell-width;
        font-size: $cell-font-size;
        color: var(--text-contrast);
        flex-grow: 1;
        &.tabulator-editing {
          border: 0;
          padding: 0 !important;
          min-height: $row-height;
          height: $row-height;
          line-height: $row-height;
          box-shadow: inset 0 1px var(--text-contrast);

          pre,
          input:not([type="checkbox"]) {
            font-family: system-ui,
              -apple-system, BlinkMacSystemFont,
              "Segoe UI",
              "Roboto",
              "Oxygen",
              "Ubuntu",
              "Cantarell",
              "Fira Sans",
              "Droid Sans",
              "Helvetica Neue",
              Arial, sans-serif;
            min-height: $row-height;
            line-height: $row-height;
            padding: 0 $cell-padding!important;
            &:focus {
              padding-bottom: 1px !important;
            }
          }
        }
        &.no-padding {
          padding: 0!important;
          > * {
            margin: 0 $cell-padding;
          }
        }

        // Checkboxes - no highlight
        &.no-edit-highlight {
          background: transparent!important;
          &.tabulator-editing {
            box-shadow: none!important;
            input[type="checkbox"] {
              box-shadow: inset 0 0 0 2px var(--text-contrast);
              &:active,
              &:checked,
              &:checked:active {
                background: var(--gray-a10)!important;
                color: var(--app-bg)!important;
                box-shadow: none!important;
              }
            }
          }
          &:hover {
            background: transparent;
          }
        }

        // Read Only
        &.read-only,
        &.read-only:hover {
          --table-cell-bg-hover: transparent;
          background: transparent!important;
          cursor: default;
          input {
            cursor: default;
          }
        }

        // Remove Cell
        &.remove-btn {
          padding: 0!important;
          cursor: default;
          .material-icons {
            line-height: $row-height;
            cursor: pointer;
            color: var(--text-muted);
            transition: color 0.2s ease-in-out;
            &:hover {
              color: var(--text-contrast);
            }
          }
        }

        .material-icons.clear {
          color: var(--text-muted);
          &:hover {
            color: var(--text-contrast);
          }
        }

        // Make checkboxes behave correctly
        .tabulator-bks-checkbox {
          display: flex;
          align-items: center;
          height: $row-height;
          input[type="checkbox"] {
            height: 18px!important;
            padding: 0!important;
            margin: 0!important;
          }
        }

        input, textarea {
          height: $row-height;
        }
        .null-value {
          color: var(--text-muted);
        }
      }
    }


    // Resize Handle
    .tabulator-row {
      padding: 0!important;
      .tabulator-row-handle {
        border: 0!important;
        padding: 0!important;
        cursor: move;
        &.tabulator-row-handle {
          .tabulator-row-handle-box {
            width: 80%;
            transform: rotate(90deg);
            margin-left: -8px;
            .tabulator-row-handle-bar {
              background: var(--border-subtle);
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
        background: var(--bg)!important;
        opacity: 1!important;
      }
    }

    // Inserted
    .tabulator-row.inserted {
      .tabulator-cell {
        &.read-only {
          &:hover {
            background: var(--gray-a4)!important;
            cursor: pointer;
            input {
              cursor: pointer;
            }
          }
          &.no-edit-highlight,
          &.never-editable,
          &.remove-btn {
            &:hover {
              background: transparent!important;
            }
          }
          &.never-editable {
            cursor: default!important;
          }
        }
        &.tabulator-editing {
          box-shadow: none!important;
          input[type="checkbox"] {
            box-shadow: inset 0 0 0 2px var(--text-contrast);
            &:active,
            &:checked,
            &:checked:active {
              background: var(--gray-a10)!important;
              box-shadow: none!important;
              &:after {
                color: var(--app-bg)!important;
              }
            }
          }
        }
      }
    }
  
  // Colours that used to live in the light theme sheet.

  // Schema Header
  .schema-header {
    .table-title {
      color: var(--text-muted);
    }
  }

  // Tabulator Header Row
  .tabulator {
    .tabulator-header {
      .tabulator-col {
        .tabulator-col-content {
          .tabulator-col-title {
            color: var(--text-muted);
          }
        }
      }
    }
  }

  // Field Rows
  .tabulator-row {
    .tabulator-cell {
      color: var(--text-contrast);
      &.tabulator-editing {
        box-shadow: inset 0 1px var(--text-contrast);
      }
      &.no-edit-highlight {
        &.tabulator-editing {
          input {
            &[type="checkbox"]:active,
            &[type="checkbox"]:checked,
            &[type="checkbox"]:checked:active {
              background: var(--checkbox-checked-bg)!important;
              color: var(--checkbox-checked-fg)!important;
            }
          }
        }
        &.edited {
          input {
            &[type="checkbox"]:active,
            &[type="checkbox"]:checked,
            &[type="checkbox"]:checked:active {
              &:after {
                color: var(--checkbox-checked-fg)!important;
              }
            }
          }
        }
      }
      &.read-only {
        input[type="checkbox"] {
          &:active,
          &:checked,
          &:checked:active {
            &:after {
              color: var(--text-contrast)!important;
            }
          }
        }
        .tabulator-bks-checkbox {
          input {
            &:after {
              color: var(--primary-text);
            }
          }
          &.editable {
            input[type="checkbox"] {
              box-shadow: inset 0 0 0 2px var(--gray-a7)!important;
              cursor: pointer!important;
              &:active,
              &:checked,
              &:checked:active {
                background: var(--checkbox-checked-bg)!important;
                &:after {
                  color: var(--checkbox-checked-fg)!important;
                }
              }
              &:focus {
                box-shadow: inset 0 0 0 2px var(--text-contrast)!important;
              }
            }
          }
        }
      }

      .material-icons.clear {
        color: var(--text-muted);
        &:hover {
          color: var(--text-contrast);
        }
      }

      // Remove Cell
      &.remove-btn {
        .material-icons {
          color: var(--text-muted);
          &:hover {
            color: var(--text-contrast);
          }
        }
      }
    }
  }

  // Resize Handle
  .tabulator-row {
    .tabulator-frozen {
      &.tabulator-row-handle {
        .tabulator-row-handle-box {
          .tabulator-row-handle-bar {
            background: var(--border-subtle);
          }
        }
      }
    }
  }
  .tabulator-row {
    &.tabulator-moving {
      background: var(--bg)!important;
    }
  }
}
</style>
