<template>
  <div class="table-info-table table-schema">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert :error="error" v-if="error" />
        <div class="table-subheader">
          <div class="table-title">
            <h2>Columns</h2>
          </div>
          <slot />
          <span class="expand"></span>
          <div class="actions">
            <a @click.prevent="refreshColumns" class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
            <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
          </div>
        </div>
        <div ref="tableSchema"></div>

      </div>
    </div>

    <div class="expand" />

    <status-bar class="tabulator-footer">
      <div class="flex flex-middle statusbar-actions">
        <slot name="footer" />
        <x-button v-if="hasEdits" class="btn btn-flat reset" @click.prevent="submitUndo">Reset</x-button>
        <x-buttons v-if="hasEdits" class="pending-changes">
          <x-button class="btn btn-primary" @click.prevent="submitApply">
            <i v-if="error" class="material-icons">error</i>
            <span class="badge" v-if="!error"><small>{{editCount}}</small></span>
            <span>Apply</span>
          </x-button>
          <x-button class="btn btn-primary" menu>
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="submitSql">
                Copy to SQL
              </x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
        <slot name="actions" />
      </div>
    </status-bar>
  </div>
</template>
<script lang="ts">
import Tabulator, { CellComponent, RowComponent } from 'tabulator-tables'
import DataMutators from '../../mixins/data_mutators'
import sqlFormatter from 'sql-formatter'
import _ from 'lodash'
import Vue from 'vue'
// import globals from '../../common/globals'
import { vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters } from 'vuex'
import { getDialectData } from '@shared/lib/dialects'
import { AppEvent } from '@/common/AppEvent'
import StatusBar from '../common/StatusBar.vue'
import { AlterTableSpec } from '@shared/lib/dialects/models'
import ErrorAlert from '../common/ErrorAlert.vue'
export default Vue.extend({
  components: {
    StatusBar,
    ErrorAlert
  },
  mixins: [DataMutators],
  props: ["table", "connection", "tabID", "active", "primaryKeys", "tabState"],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false,
      editedCells: [],
      newRows: [],
      removedRows: [],
      error: null
    }
  },
  watch: {
    hasEdits() {
      this.tabState.dirty = this.hasEdits
    },
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
    editedCells(newCells: CellComponent[], oldCells: CellComponent[]) {
      const removed = oldCells.filter((c) => !newCells.includes(c))
      newCells.forEach((c) => c.getElement().classList.add('edited'))
      removed.forEach((c) => c.getElement().classList.remove('edited'))
    },
    newRows(nuRows: RowComponent[], oldRows: RowComponent[]) {
      const removed = oldRows.filter((r) => !nuRows.includes(r))
      nuRows.forEach((r) => {
        r.getElement().classList?.add('inserted')
      })
      removed.forEach((r) => {
        r.getElement().classList?.remove('inserted')
      })
    },
    removedRows(newRemoved: RowComponent[], oldRemoved: RowComponent[]) {
      const removed = oldRemoved.filter((r) => !newRemoved.includes(r))
      newRemoved.forEach((r) => r.getElement().classList?.add('deleted'))
      removed.forEach((r) => r.getElement().classList?.remove('deleted'))
    },
    tableData: {
      deep: true,
      handler() {
        if (!this.tabulator) return
        this.tabulator.replaceData(this.tableData)
      }
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    disabledFeatures() {
      return getDialectData(this.dialect).disabledFeatures
    },
    editCount() {
      return this.editedCells.length + this.newRows.length + this.removedRows.length
    },
    columnTypes() {
      return getDialectData(this.dialect).columnTypes.map((c) => c.pretty)
    },
    hasEdits() {
      return this.editCount > 0
    },
    tableColumns() {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        showListOnEmpty: true
      }


      const result = [
        {
          title: 'Name', 
          field: 'columnName', 
          editor: vueEditor(NullableInputEditorVue), 
          cellEdited: this.cellEdited, 
          headerFilter: true, 
          formatter: this.cellFormatter,
          editable: this.isCellEditable.bind(this, 'renameColumn')
        },
        {
          title: 'Type',
          field: 'dataType',
          editor: 'autocomplete',
          editorParams: autocompleteOptions,
          cellEdited: this.cellEdited,
          editable: this.isCellEditable.bind(this, 'alterColumn')
          }, 
        {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditorVue),
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: this.isCellEditable.bind(this, 'alterColumn')
          },
          cellEdited: this.cellEdited,
          editable: this.isCellEditable.bind(this, 'alterColumn'),
          width: 70,
          cssClass: "no-padding no-edit-highlight",
        },
        {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditorVue),
          headerTooltip: "Be sure to 'quote' string values.",
          cellEdited: this.cellEdited,
          formatter: this.cellFormatter,
          editable: this.isCellEditable.bind(this, 'alterColumn'),
        },
        {
          title: 'Primary',
          field: 'primary',
          tooltip: false,
          editable: false,
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: false
          },
          width: 70,
          cssClass: "read-only never-editable",
        },
        {
          field: 'trash-button',
          formatter: (_cell) => `<div class="dynamic-action" />`,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: this.removeRow,
          resizable: false,
          cssClass: "remove-btn read-only",
        }
      ]
      return result.map((col) => {
        const editable = _.isFunction(col.editable) ? col.editable({ getRow: () => ({})}) : col.editable
        const cssBase = col.cssClass || null
        const extraCss = editable ? 'editable' : 'read-only'
        const cssClass = cssBase ? `${cssBase} ${extraCss}` : extraCss
        return { ...col, cssClass }
      })
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
    isCellEditable(feature: string, cell: CellComponent): boolean {
      // views and materialized views are not editable
      if (this.table.entityType !== 'table') return false
      if (this.removedRows.includes(cell.getRow())) return false

      const isDisabled = this.disabledFeatures?.alter?.[feature]
      const isNewRow = this.newRows.includes(cell.getRow())

      return (isNewRow || !isDisabled)
    },
    async refreshColumns() {
      if(this.hasEdits) {
        if (!window.confirm("Are you sure? You will lose unsaved changes")) {
          return
        }
      }
      this.submitUndo()
      await this.$store.dispatch('updateTableColumns', this.table)
    },
    collectChanges(): AlterTableSpec {

      const alterations = this.editedCells.map((cell: CellComponent) => {

        // renames happen last, so we need to get the original column name here.
        const nameCell = cell.getRow().getCell('columnName')
        const name = nameCell.isEdited() ? nameCell.getInitialValue() : nameCell.getValue()

        return {
          changeType: cell.getField(),
          columnName: name,
          newValue: cell.getValue()
        }
      })

      const adds = this.newRows.map((row) => {
        return row.getData()
      })

      const drops = this.removedRows.map((row) => row.getData()['columnName'])

      return {
        table: this.table.name,
        schema: this.table.schema,
        alterations,
        adds,
        drops
      }
    },
    // submission methods
    async submitApply(): Promise<void> {
      try {
        this.error = null
        const changes = this.collectChanges()
        await this.connection.alterTable(changes)

        this.clearChanges()
        await this.$store.dispatch('updateTableColumns', this.table)
        this.$nextTick(() => {
          this.initializeTabulator()
        })
        this.$noty.success(`${this.table.name} Updated`)
      } catch(ex) {
        this.error = ex
        console.error(ex)
      }
    },
    async submitSql(): Promise<void> {
      try {
        this.error = null
        const changes = this.collectChanges()
        const sql = await this.connection.alterTableSql(changes)
        const formatted = sqlFormatter.format(sql)
        this.$root.$emit(AppEvent.newTab, formatted)
      } catch (ex) {
        this.error = ex
      }
    },
    submitUndo(): void {
      this.editedCells.forEach((c) => {
        c.restoreInitialValue()
      })
      
      this.newRows.forEach((r) => r.delete())
      this.clearChanges()
    },
    clearChanges() {
      this.editedCells = []
      this.newRows = []
      this.removedRows = []
    },
    // table edit callbacks
    async addRow(): Promise<void> {
      if (this.disabledFeatures?.alter?.addColumn) {
        this.$noty.info(`Adding columns is not supported by ${this.dialect}`)
      }
      const data = this.tabulator.getData()
      const name = `column_${data.length + 1}`
      const row: RowComponent = await this.tabulator.addRow({columnName: name, dataType: 'varchar(255)', nullable: true})
      const cell = row.getCell('columnName')
      this.newRows.push(row)
      if (cell) {
        // don't know why I need this, but I do
        setTimeout(() => cell.edit(), 50)
      }
    },
    removeRow(_e, cell: CellComponent): void {
      const row = cell.getRow()
      if (this.newRows.includes(row)) {
        this.newRows = _.without(this.newRows, row)
        row.delete()
        return
      }
      if (this.removedRows.includes(row)) {
        this.removedRows = _.without(this.removedRows, row)
      } else {
        if (this.disabledFeatures?.alter?.dropColumn) {
          this.$noty.info(`Adding columns is not supported by ${this.dialect}`)
          return
        }
        this.removedRows.push(row)
        const undoEdits = this.editedCells.filter((c) => row.getCells().includes(c))
        undoEdits.forEach((c) => {
          c.restoreInitialValue()
        })
        this.editedCells = _.without(this.editedCells, ...undoEdits)
      }
    },
    cellEdited(cell: CellComponent) {
      const rowIncluded = [...this.newRows, ...this.removedRows].includes(cell.getRow())
      const existingCell: CellComponent = this.editedCells.find((c) => c === cell)
      if(!rowIncluded && !existingCell) {
        this.editedCells.push(cell)
      }

      if(existingCell) {
        if (existingCell.getInitialValue() === existingCell.getValue()) {
          this.editedCells = _.without(this.editedCells, existingCell);
        }
      }
    },
    initializeTabulator() {
      if (this.tabulator) this.tabulator.destroy()
      this.tabulator = new Tabulator(this.$refs.tableSchema, {
        columns: this.tableColumns,
        layout: 'fitColumns',
        tooltips: true,
        data: this.tableData,
        resizableColumns: false,
        placeholder: "No Columns",
        headerSort: false,
      })

    }
  },
  mounted() {
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    if (!this.active) this.forceRedraw = true
    this.initializeTabulator()
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  }
})
</script>