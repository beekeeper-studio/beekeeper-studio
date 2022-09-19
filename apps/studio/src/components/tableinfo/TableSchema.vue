<template>
  <div class="table-info-table table-schema" v-hotkey="hotkeys">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert :error="error" v-if="error" />
        <div class="notices" v-if="notice">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>{{notice}}</div>
          </div>
        </div>

        <div class="table-subheader">
          <div class="table-title">
            <h2>Columns</h2>
          </div>
          <slot />
          <span class="expand"></span>
          <div class="actions">
            <a @click.prevent="refreshColumns" v-tooltip="`${ctrlOrCmd('r')} or F5`" class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
            <a v-if="editable" v-tooltip="ctrlOrCmd('n')" @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
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
              <x-menuitem @click.prevent="submitApply">
                <x-label>Apply</x-label>
                <x-shortcut value="Control+S"></x-shortcut>
              </x-menuitem>
              <x-menuitem @click.prevent="submitSql">
                <x-label>Copy to SQL</x-label>
                <x-shortcut value="Control+Shift+S"></x-shortcut>
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
import { TabulatorFull, Tabulator } from 'tabulator-tables'
type CellComponent = Tabulator.CellComponent
type RowComponent = Tabulator.RowComponent
import DataMutators from '../../mixins/data_mutators'
import { format } from 'sql-formatter'
import _ from 'lodash'
import Vue from 'vue'
// import globals from '../../common/globals'
import { vueEditor, vueFormatter, trashButton, TabulatorStateWatchers } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters } from 'vuex'
import { getDialectData } from '@shared/lib/dialects'
import { AppEvent } from '@/common/AppEvent'
import StatusBar from '../common/StatusBar.vue'
import { AlterTableSpec, FormatterDialect } from '@shared/lib/dialects/models'
import ErrorAlert from '../common/ErrorAlert.vue'


const FakeCell = {
  getRow: () => ({}),
  getField: () => 'fake',
  getValue: () => 'fake'

}

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
    ...TabulatorStateWatchers
  },
  computed: {
    ...mapGetters(['dialect', 'dialectData']),
    hotkeys() {
      if (!this.active) return {}
      const result = {}
      result['f5'] = this.refreshColumns.bind(this)
      result[this.ctrlOrCmd('n')] = this.addRow.bind(this)
      result[this.ctrlOrCmd('r')] = this.refreshColumns.bind(this)
      result[this.ctrlOrCmd('s')] = this.submitApply.bind(this)
      result[this.ctrlOrCmd('shift+s')] = this.submitSql.bind(this)
      return result
    },
    editable() {
      return this.table.entityType === 'table' &&
        !!this.primaryKeys.length &&
        !this.dialectData.disabledFeatures?.alter?.everything
    },
    notice() {
      return this.dialectData.notices?.infoSchema || null
    },
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
        (this.disabledFeatures?.informationSchema?.extra ? null : {
          title: "Extra",
          field: 'extra',
          tooltip: true,
          headerTooltip: 'eg AUTO_INCREMENT',
          editable: this.isCellEditable.bind(this, 'alterColumn'),
          formatter: this.cellFormatter,
          cellEdited: this.cellEdited,
          editor: vueEditor(NullableInputEditorVue)
        }),
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
        this.editable ? trashButton(this.removeRow) : null
      ].filter((c) => !!c)
      return result.map((col) => {
        const editable = _.isFunction(col.editable) ? col.editable(FakeCell) : col.editable
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

      if (!this.editable) return false
      if (this.removedRows.includes(cell.getRow())) return false

      const isDisabled = this.disabledFeatures?.alter?.[feature]
      const isNewRow = this.newRows.includes(cell.getRow())
      const result = (isNewRow || !isDisabled)
      return result
    },
    async refreshColumns() {
      if(this.hasEdits) {
        if (!window.confirm("Are you sure? You will lose unsaved changes")) {
          return
        }
      }
      this.submitUndo()
      this.error = null;
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
        const formatted = format(sql, { language: FormatterDialect(this.dialect)})
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
      this.newRows.push(row)
      // TODO (fix): calling edit() on the column name cell isn't working here.
      // ideally we could drop users into the first cell to make editing easier
      // but right now if it fails it breaks the whole table.
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
      // @ts-ignore
      this.tabulator = new TabulatorFull(this.$refs.tableSchema, {
        columns: this.tableColumns,
        layout: 'fitColumns',
        columnDefaults: {
          title: '',
          tooltip: true,
          resizable: false,
          headerSort: false,
        },
        data: this.tableData,
        placeholder: "No Columns",
      })

    }
  },
  mounted() {
    this.tabState.dirty = false
    // const columnWidth = this.table.columns.length > 20 ? 125 : undefined
    if (!this.active) this.forceRedraw = true
    this.initializeTabulator()
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  }
})
</script>
