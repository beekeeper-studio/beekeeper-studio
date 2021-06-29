<template>
  <div class="table-info-table table-schema">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Columns</h2>
      </div>
      <div class="table-actions">
        <a @click="addRow" class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Column</a>
      </div>
    </div>
    <div ref="tableSchema"></div>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import DataMutators from '../../mixins/data_mutators'
import _ from 'lodash'
import Vue from 'vue'
import globals from '../../common/globals'
import { vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters } from 'vuex'
import { getDialectData } from '@shared/lib/dialects'
export default {
  mixins: [DataMutators],
  props: ["table", "connection", "tabID", "active", "primaryKeys"],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false,
      stagedChanges: [],
      newColumns: [],
      removedColumns: [],
    }
  },
  watch: {
    active() {
      if (!this.tabulator) return;
      if (this.active) {
        this.tabulator.restoreRedraw()
        this.$nextTick(() => {
          this.tabulator.redraw(this.forceRedraw)
          this.forceRedraw = false
        })
      } else {
        this.tabulator.blockRedraw()
      }
    },
    tableData() {
      if (!this.tabulator) return
      this.tabulator.replaceData(this.tableData)
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    columnTypes() {
      return getDialectData(this.dialect).columnTypes
    },
    tableColumns() {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }

      const trashButton = () => '<i class="material-icons" title="remove">clear</i>'

      return [
        {title: 'Name', field: 'columnName', editor: vueEditor(NullableInputEditorVue), cellEdited: this.cellEdited, headerFilter: true},
        {title: 'Type', field: 'dataType', editor: 'autocomplete', editorParams: autocompleteOptions, cellEdited: this.cellEdited}, 
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditorVue),
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: true
          },
          cellEdited: this.cellEdited
        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditorVue),
          headerTooltip: "If you don't set a value for this field, this is the default value",
          cellEdited: this.cellEdited,
          formatter: this.cellFormatter
        },
        {
          title: 'Primary',
          field: 'primary',
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: false
          }
        },
        {
          formatter: trashButton, width: 36, minWidth: 36, hozAlign: 'center', cellClick: this.removeRow, resizable: false, cssClass: "remove-btn no-edit-highlight",
        }
      ]
    },
    tableData() {
      const keys = _.keyBy(this.primaryKeys, 'columnName')
      return this.table.columns.map((c) => {
        const key = keys[c.columnName]
        return { 
          primary: !!key || null,
          ...c
        }
      })
    },
  },
  methods: {
    async addRow() {
      const row = await this.tabulator.addRow({columnName: 'untitled', dataType: 'varchar(255)'})
      row.getElement().classList.add('inserted')
      this.newColumns.push(row)
    },
    removeRow(e, cell) {
      const row = cell.getRow()
      if (this.newColumns.includes(row)) {
        this.newColumns = _.without(this.newcolumns, row)
      }
      this.removedColumns.push(row)
      row.getElement().classList.add('deleted')
    },
    cellEdited(cell, ...props) {
      const columnName = cell.getRow().getCells().find((c) => c.getField())
      const change = {
        columnName,
        aspect: cell.getField(),
        newValue: cell.getValue(),
        cell: cell
      }
      this.stagedChanges.push(change)
      cell.getElement().classList.add('edited')
    }
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    if (!this.active) this.forceRedraw = true
    this.tabulator = new Tabulator(this.$refs.tableSchema, {
      columns: this.tableColumns,
      layout: 'fitColumns',
      tooltips: true,
      data: this.tableData,
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Columns"
    })
  }
}
</script>