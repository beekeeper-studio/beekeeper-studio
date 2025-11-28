<template>
  <div
    class="table-info-table table-schema"
    v-hotkey="hotkeys"
  >
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert
          :error="error"
          v-if="error"
        />
        <div
          class="notices"
          v-if="notice"
        >
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>{{ notice }}</div>
          </div>
        </div>

        <div class="table-subheader">
          <div class="table-title">
            <h2>Columns</h2>
          </div>
          <slot />
          <span class="expand" />
          <div class="actions">
            <a
              @click.prevent="refreshColumns"
              v-tooltip="`${ctrlOrCmd('r')} or F5`"
              class="btn btn-link btn-fab"
            ><i class="material-icons">refresh</i></a>
            <a
              v-if="editable"
              v-tooltip="ctrlOrCmd('n')"
              @click.prevent="addRow"
              class="btn btn-primary btn-fab"
            ><i class="material-icons">add</i></a>
          </div>
        </div>
        <div ref="tableSchema" />
        <!-- Tabulator can be slow to open especially for some really large column counts. Let the user know. -->
        <div
          v-if="this.table.columns.length"
          class="columns-loading-disclaimer"
        >
          <p>Columns loading.</p>
          <p>This may take a few minutes depending on column count.</p>
        </div>
      </div>
    </div>

    <div class="expand" />

    <status-bar class="tabulator-footer" :active="active">
      <div class="flex flex-middle statusbar-actions">
        <slot name="footer" />
        <x-button
          v-if="hasEdits"
          class="btn btn-flat reset"
          @click.prevent="submitUndo"
        >
          Reset
        </x-button>
        <x-buttons
          v-if="hasEdits"
          class="pending-changes"
        >
          <x-button
            class="btn btn-primary"
            @click.prevent="submitApply"
          >
            <i
              v-if="error"
              class="material-icons"
            >error</i>
            <span
              class="badge"
              v-if="!error"
            ><small>{{ editCount }}</small></span>
            <span>Apply</span>
          </x-button>
          <x-button
            class="btn btn-primary"
            menu
          >
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="submitApply">
                <x-label>Apply</x-label>
                <x-shortcut value="Control+S" />
              </x-menuitem>
              <x-menuitem @click.prevent="submitSql">
                <x-label>Copy to SQL</x-label>
                <x-shortcut value="Control+Shift+S" />
              </x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
        <slot name="actions" />
      </div>
    </status-bar>
  </div>
</template>

<style scoped>
  .columns-loading-disclaimer {
    width: 100%;
    text-align: center;
    font-weight: 700;
    font-size: 20px;

  }
  .tabulator + .columns-loading-disclaimer {
    display: none;
  }
</style>

<script lang="ts">
import { TabulatorFull, CellComponent, RowComponent } from 'tabulator-tables'
import DataMutators from '../../mixins/data_mutators'
import { format } from 'sql-formatter'
import _ from 'lodash'
import Vue from 'vue'
// import globals from '../../common/globals'
import { vueEditor, vueFormatter, trashButton, TabulatorStateWatchers, moveRowHandle } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters, mapState } from 'vuex'
import { getDialectData } from '@shared/lib/dialects'
import { AppEvent } from '@/common/AppEvent'
import StatusBar from '../common/StatusBar.vue'
import { AlterTableSpec, FormatterDialect } from '@shared/lib/dialects/models'
import ErrorAlert from '../common/ErrorAlert.vue'
import rawLog from '@bksLogger'
import { escapeHtml } from '@shared/lib/tabulator'
import { ExtendedTableColumn } from '@/lib/db/models'

const log = rawLog.scope('table-schema')

const FakeCell = {
  getRow: () => ({
    getData: () => ({})
  }),
  getField: () => 'fake',
  getValue: () => 'fake'

}

export default Vue.extend({
  components: {
    StatusBar,
    ErrorAlert
  },
  mixins: [DataMutators],
  props: ["table", "tabID", "active", "primaryKeys", "tabState"],
  data() {
    return {
      tabulator: null,
      actualTableHeight: "100%",
      forceRedraw: false,
      editedCells: [],
      newRows: [],
      removedRows: [],
      error: null,
      reorderedRows: Array.from(new Set()),
      initialColumns: []
    }
  },
  watch: {
    hasEdits() {
      this.tabState.dirty = this.hasEdits
    },
    primaryKeys() {
      log.info('tabulator primary keys changed', this.primaryKeys)
      this.initializeTabulator()
    },
    ...TabulatorStateWatchers
  },
  computed: {
    ...mapGetters(['dialect', 'dialectData']),
    ...mapState(['database', 'connection', 'usedConfig']),
    hotkeys() {
      return this.$vHotkeyKeymap({
        'general.refresh': this.refreshColumns,
        'general.addRow': this.addRow,
        'general.save': this.submitApply,
        'general.openInSqlEditor': this.submitSql,
      })
    },
    editable() {
      // (sept 23) we don't need a primary key to make schemas editable
      return !this.usedConfig.readOnlyMode &&
        this.table.entityType === 'table' &&
        !this.dialectData.disabledFeatures?.alter?.everything
    },
    notice() {
      return this.dialectData.notices?.infoSchema || null
    },
    disabledFeatures() {
      return getDialectData(this.dialect).disabledFeatures
    },
    editCount() {
      return this.editedCells.length + this.newRows.length + this.removedRows.length + this.reorderedRows.length
    },
    columnTypes() {
      return getDialectData(this.dialect).columnTypes.map((c) => c.pretty)
    },
    hasEdits() {
      return this.editCount > 0
    },
    tableColumns() {
      const canMoveRows = !this.dialectData.disabledFeatures?.alter?.reorderColumn
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        listOnEmpty: true,
        autocomplete: true,
      }

      const result = [
        (canMoveRows) ? moveRowHandle() : null,
        {
          title: 'Name',
          field: 'columnName',
          editor: vueEditor(NullableInputEditorVue),
          cellEdited: this.cellEdited,
          tooltip: this.columnNameCellTooltip.bind(this),
          formatter: this.cellFormatter,
          editable: this.isCellEditable.bind(this, 'renameColumn'),
          cssClass: this.customColumnCssClass('renameColumn'),
          cellClick: this.columnNameCellClick.bind(this),
          frozen: true,
          minWidth: 100,
        },
        {
          title: 'Type',
          field: 'dataType',
          editor: 'list',
          editorParams: autocompleteOptions,
          cellEdited: this.cellEdited,
          editable: this.isCellEditable.bind(this, 'alterColumn'),
          cssClass: this.customColumnCssClass('alterColumn'),
          minWidth: 90,
        },
        (this.disabledFeatures?.nullable) ? null : {
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
          cssClass: this.customColumnCssClass('alterColumn') + ' no-padding no-edit-highlight',
        },
        (this.disabledFeatures?.defaultValue) ? null : {
          title: 'Default Value',
          field: 'defaultValue',
          editor: vueEditor(NullableInputEditorVue),
          headerTooltip: "Be sure to 'quote' string values.",
          cellEdited: this.cellEdited,
          formatter: this.cellFormatter,
          editable: this.isCellEditable.bind(this, 'alterColumn'),
          cssClass: this.customColumnCssClass('alterColumn'),
          minWidth: 90,
        },
        (this.disabledFeatures?.informationSchema?.extra ? null : {
          title: "Extra",
          field: 'extra',
          tooltip: true,
          headerTooltip: 'eg AUTO_INCREMENT',
          editable: false,
          cssClass: this.customColumnCssClass('alterColumn'),
          formatter: this.cellFormatter,
          minWidth: 90,
        }),
        (this.disabledFeatures?.comments ? null : {
          title: 'Comment',
          field: 'comment',
          tooltip: true,
          headerTooltip: "Leave a friendly comment for other database users about this column",
          editable: this.isCellEditable.bind(this, 'alterColumn'),
          cssClass: this.customColumnCssClass('alterColumn'),
          formatter: this.cellFormatter,
          cellEdited: this.cellEdited,
          editor: vueEditor(NullableInputEditorVue),
          minWidth: 90,
        }),
        (this.disabledFeatures?.primary ? null : {
          title: 'Primary',
          field: 'primary',
          tooltip: false,
          editable: false,
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: false
          },
          width: 70,
          cssClass: 'read-only never-editable',
        }),
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
    customColumnCssClass(feature: string) {
      return this.isEditable(feature) ? 'editable' : 'read-only'
    },
    isEditable(feature: string): boolean {
      return this.editable && !this.disabledFeatures?.alter?.[feature]
    },
    isCellEditable(feature: string, cell: CellComponent): boolean {
      // views and materialized views are not editable

      if (!this.editable) return false
      if (this.removedRows.includes(cell.getRow())) return false
      const row = cell.getRow()
      const columnName = row.getData()['columnName']
      const column: ExtendedTableColumn | undefined = this.table.columns.find((c) => c.columnName === columnName)

      if (feature === 'alterColumn' && column?.generated)  {
        return false
      }

      const isNewRow = this.newRows.includes(cell.getRow())

      return isNewRow || this.isEditable(feature)
    },
    async refreshColumns() {
      if(this.hasEdits) {
        const confirmed = await this.$confirm("Are you sure? You will lose unsaved changes")
        if (!confirmed) {
          return
        }
      }
      this.submitUndo()
      this.error = null;
      await this.$emit('refresh')
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

      const reorder = (this.reorderedRows.length > 0)
        ? { oldOrder: this.initialColumns.slice(0), newOrder: this.tabulator.getData() }
        : null

      return {
        table: this.table.name,
        schema: this.table.schema,
        database: this.database,
        alterations,
        adds,
        drops,
        reorder
      }
    },
    // submission methods
    async submitApply(): Promise<void> {
      try {
        if (this.usedConfig.readOnlyMode) return;
        this.error = null
        const changes = this.collectChanges()
        await this.connection.alterTable(changes);

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
      if (this.usedConfig.readOnlyMode) return;
      try {
        this.error = null
        const changes = this.collectChanges()
        const sql = await this.connection.alterTableSql(changes);
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

      this.error = null;
      this.$emit('refresh')
    },
    clearChanges() {
      this.editedCells = []
      this.newRows = []
      this.removedRows = []
      this.reorderedRows = []
    },
    // table edit callbacks
    async addRow(): Promise<void> {
      if (this.usedConfig.readOnlyMode) return;
      if (this.disabledFeatures?.alter?.addColumn) {
        this.$noty.info(`Adding columns is not supported by ${this.dialect}`)
      }
      const data = this.tabulator.getData()
      const name = `column_${data.length + 1}`
      const { defaultColumnType } = getDialectData(this.dialect)
      const defaultType = defaultColumnType || 'VARCHAR(255)'
      const row: RowComponent = await this.tabulator.addRow({columnName: name, dataType: defaultType, nullable: true})
      this.newRows.push(row)
      // TODO (fix): calling edit() on the column name cell isn't working here.
      // ideally we could drop users into the first cell to make editing easier
      // but right now if it fails it breaks the whole table.
    },
    removeRow(_e, cell: CellComponent): void {
      if (this.usedConfig.readOnlyMode) return;
      const row = cell.getRow()
      const s = new Set(this.reorderedRows)

      s.delete(row)
      this.reorderedRows = Array.from(s)

      if (this.newRows.includes(row)) {
        this.newRows = _.without(this.newRows, row)
        row.delete()
        return
      }
      if (this.removedRows.includes(row)) {
        this.removedRows = _.without(this.removedRows, row)
      } else {
        if (this.disabledFeatures?.alter?.dropColumn) {
          this.$noty.info(`Removing columns is not supported by ${this.dialect}`)
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
    movedRows (row) {
      if (this.usedConfig.readOnlyMode) return;
      const s = new Set(this.reorderedRows)
      s.add(row)

      this.reorderedRows = Array.from(s)
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
      log.info('initializing tabulator, (editable, columns)', this.editable, this.tableColumns)
      const canMoveRows = !this.dialectData.disabledFeatures?.alter?.reorderColumn

      this.initialColumns = this.tableData.slice(0)
      if (this.tabulator) this.tabulator.destroy()
      // TODO: a loader would be so cool for tabulator for those gnarly column count tables that people might create...
      this.tabulator = new TabulatorFull(this.$refs.tableSchema, {
        columns: this.tableColumns,
        layout: 'fitColumns',
        movableRows: canMoveRows,
        columnDefaults: {
          title: '',
          tooltip: true,
          resizable: false,
          headerSort: false,
        },
        data: this.tableData,
        placeholder: "No Columns",
      })

      this.tabulator.on('rowMoved', (row) => this.movedRows(row))
    },
    columnNameCellClick(_e: any, cell: CellComponent) {
      if (!this.editable || this.disabledFeatures?.alter?.renameColumn) {
        const element = cell.getElement()
        element.classList.add('copied');
        setTimeout(() => element.classList.remove('copied'), 500)
        this.$native.clipboard.writeText(cell.getValue(), true);
      }
    },
    columnNameCellTooltip(_e: any, cell: CellComponent, _onRendered: any) {
      let canCopy: boolean = !this.editable || this.disabledFeatures?.alter?.renameColumn;
      const cellName = escapeHtml(cell.getValue());
      return canCopy ? `${cellName} - Click to Copy` : cellName;
    },
  },
  async mounted() {
    this.tabState.dirty = false
    // table columns are updated by TabTableProperties on load. So no need to do it here.
    if (!this.active) this.forceRedraw = true
    this.initializeTabulator()
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  },
})
</script>

