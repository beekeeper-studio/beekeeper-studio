<template>
  <div class="table-info-table table-schema">
    <div class="table-subheader">
      <div class="table-title">
        <h2>Columns</h2>
      </div>
      <span class="expand"></span>
      <div class="actions">
        <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
      </div>
    </div>
    <div ref="tableSchema"></div>
  </div>
</template>
<script>
import Tabulator from 'tabulator-tables'
import DataMutators from '../../mixins/data_mutators'
import sqlFormatter from 'sql-formatter'
import _ from 'lodash'
import Vue from 'vue'
import globals from '../../common/globals'
import { vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters } from 'vuex'
import { getDialectData } from '@shared/lib/dialects'
import { AlterTablePayload } from '@/lib/db/models'
import { AppEvent } from '@/common/AppEvent'
export default {
  mixins: [DataMutators],
  props: ["table", "connection", "tabID", "active", "primaryKeys"],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false,
      editedCells: [],
      newRows: [],
      removedRows: [],
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
      return getDialectData(this.dialect).columnTypes.map((c) => c.pretty)
    },
    hasEdits() {
      return this.editedCells.length || this.newRows.length || this.removedRows.length
    },
    tableColumns() {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }

      const trashButton = (cell) => `<i class="material-icons" title="${cell.getValue() === 'undo' ? 'Undo delete table column' : 'Delete table column'}">${cell.getValue() === 'undo' ? 'undo' : 'close'}</i>`

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
          cellEdited: this.cellEdited,
          width: 70,
          cssClass: "no-edit-highlight",
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
          },
          width: 70,
          cssClass: "no-edit-highlight",
        },
        {
          field: 'trash-button',
          formatter: trashButton,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: this.removeRow,
          resizable: false,
          cssClass: "remove-btn no-edit-highlight",
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
    collectChanges() {

      const updates = this.editedCells.map((cell) => {
        return {
          changeType: cell.getField(),
          columnName: cell.getRow().getData()['columnName'],
          newValue: cell.getValue()
        }
      })

      const inserts = this.newRows.map((row) => {
        return row.getData()
      })

      const deletes = this.removedRows.map((row) => row.getData()['columnName'])

      return {
        table: this.table.name,
        schema: this.table.schema,
        updates,
        inserts,
        deletes
      }
    },
    // submission methods
    async submitApply() {
      const changes = this.collectChanges()
      const result = await this.connection.alterTable(changes)
      this.$noty.success(`${this.table.name} Updated`)
      this.$root.$emit('loadTable', { table: this.table })
    },
    submitSql() {
      const changes = this.collectChanges()
      const sql = this.connection.alterTableSql(changes)
      const formatted = sqlFormatter.format(sql)
      this.$root.$emit(AppEvent.newTab, formatted)
    },
    submitUndo() {
      this.editedCells.forEach((c) => {
        c.restoreInitialValue()
        c.getElement().classList.remove('edited')
      })
      
      this.newRows.forEach((r) => r.delete())
      this.removedRows.forEach((r) => {
        r.getElement().classList.remove('deleted')
        const c = r.getCell('trash-button')
        c.setValue('trash')
      })

      this.editedCells = []
      this.newRows = []
      this.removedRows = []
    },
    // table edit callbacks


    async addRow() {
      const row = await this.tabulator.addRow({columnName: 'untitled', dataType: 'varchar(255)'})
      row.getElement().classList.add('inserted')
      this.newRows.push(row)
    },
    removeRow(e, cell) {
      const row = cell.getRow()
      console.log(row)
      if (this.newRows.includes(row)) {
        this.newRows = _.without(this.newRows, row)
        row.delete()
        return
      }
      if (this.removedRows.includes(row)) {
        this.removedRows = _.without(this.removedRows, row)
        row.getElement().classList.remove('deleted')
        cell.setValue('trash')
      } else {
        this.removedRows.push(row)
        row.getElement().classList.add('deleted')
        cell.setValue('undo')
        const undoEdits = this.editedCells.filter((c) => row.getCells().includes(c))
        undoEdits.forEach((c) => {
          c.restoreInitialValue()
          c.getElement().classList.remove('edited')
        })
        this.editedCells = _.without(this.editedCells, undoEdits)
      }
    },
    cellEdited(cell, ...props) {
      if(![...this.newRows, this.removedRows].includes(cell.getRow())) {
        this.editedCells.push(cell)
        cell.getElement().classList.add('edited')
      }
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
      placeholder: "No Columns",
      headerSort: false,
    })
  }
}
</script>