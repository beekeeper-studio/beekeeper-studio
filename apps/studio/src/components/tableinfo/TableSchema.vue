<template>
  <div class="table-info-table table-schema">
    <div class="table-info-table-wrap">
      <div class="table-subheader">
        <div class="table-title">
          <h2>Columns</h2>
        </div>
        <error-alert :error="error" v-if="error" />
        <slot />
        <span class="expand"></span>
        <div class="actions">
          <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
        </div>
      </div>
      <div ref="tableSchema"></div>
    </div>

    <div class="expand" />

    <status-bar class="tabulator-footer">
      <slot name="footer" />
      <div class="col flex-right statusbar-actions">
        <x-button v-if="hasEdits" class="btn btn-flat" @click.prevent="submitUndo">Reset</x-button>
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
import globals from '../../common/globals'
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
  props: ["table", "connection", "tabID", "active", "primaryKeys"],
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

      const trashButton = (cell) => `<i class="material-icons" title="${cell.getValue() === 'undo' ? 'Undo delete table column' : 'Delete table column'}">${cell.getValue() === 'undo' ? 'undo' : 'close'}</i>`

      return [
        {title: 'Name', field: 'columnName', editor: vueEditor(NullableInputEditorVue), cellEdited: this.cellEdited, headerFilter: true, formatter: this.cellFormatter},
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
    collectChanges(): AlterTableSpec {

      const alterations = this.editedCells.map((cell: CellComponent) => {

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
        const result = await this.connection.alterTable(changes)
        console.log(result)
        this.$noty.success(`${this.table.name} Updated`)
      } catch(ex) {
        this.error = ex
      }

    },
    submitSql(): void {
      try {
        this.error = null
        const changes = this.collectChanges()
        const sql = this.connection.alterTableSql(changes)
        const formatted = sqlFormatter.format(sql)
        this.$root.$emit(AppEvent.newTab, formatted)
      } catch (ex) {
        this.error = ex
      }
    },
    submitUndo(): void {
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
    async addRow(): Promise<void> {
      const data = this.tabulator.getData()
      const name = `column_${data.length + 1}`
      const row: RowComponent = await this.tabulator.addRow({columnName: name, dataType: 'varchar(255)', nullable: true})
      const cell = row.getCell('columnName')
      row.getElement().classList.add('inserted')
      this.newRows.push(row)
      console.log(cell)
      if (cell) {
        // don't know why I need this, but I do
        setTimeout(() => cell.edit(), 50)
      }

},
    removeRow(_e, cell): void {
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
    cellEdited(cell) {
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
      // @ts-ignore-error
      columnMaxInitialWidth: globals.maxColumnWidthTableInfo,
      placeholder: "No Columns",
      headerSort: false,
    })
  }
})
</script>