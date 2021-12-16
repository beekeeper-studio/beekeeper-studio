<template>
  <div class="table-info-table view-only">
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
            <h2>Relations</h2>
          </div>
          <div class="expand"></div>
          <div class="actions">
              <a @click.prevent="$emit('refresh')" class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
              <a v-if="canAdd" @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
          </div>
        </div>
        <div class="table-relations" ref="tabulator"></div>
      </div>
    </div>
    
    <div class="expand" />

    <status-bar class="tabulator-footer">
      <div class="flex flex-middle flex-right statusbar-actions">
        <slot name="footer" />
        <x-button v-if="hasEdits && !loading" class="btn btn-flat reset" @click.prevent="submitUndo">Reset</x-button>
        <x-buttons v-if="hasEdits && !loading" class="pending-changes">
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
import Vue from 'vue'
import Tabulator, { CellComponent, ColumnDefinition, Editor, RowComponent } from 'tabulator-tables'
import StatusBar from '../common/StatusBar.vue'
import { TabulatorStateWatchers, trashButton, vueEditor } from '@shared/lib/tabulator/helpers'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters, mapState } from 'vuex'
import { CreateRelationSpec, Dialect, DialectTitles, FormatterDialect, RelationAlterations } from '@shared/lib/dialects/models'
import { TableColumn, TableOrView } from '@/lib/db/models'
import _ from 'lodash'
import { format } from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import rawLog from 'electron-log'
import ErrorAlert from '../common/ErrorAlert.vue'
const log = rawLog.scope('TableRelations');

export default Vue.extend({
  props: ["table", "connection", "tabId", "active", "properties", 'tabState'],
  components: {
    StatusBar,
    ErrorAlert
  },
  data() {
    return {
      tabulator: null,
      newRows: [],
      removedRows: [],
      error: null,
      loading: false
    }
  },
  computed: {
    ...mapState(['tables']),
    ...mapGetters(['schemas', 'dialect', 'schemaTables', 'dialectData']),
    notice() {
      const results = []
      if (!this.canAdd) {
        results.push("Adding relations is not supported")
      }
      if (!this.canDrop) {
        results.push("Dropping constraints is not supported")
      }
      if (results?.length) {
        return `${DialectTitles[this.dialect]}: ${results.join(". ")}`
      }
      return null
    },
    canAdd() {
      return !this.dialectData?.disabledFeatures?.alter?.addConstraint
    },
    canDrop() {
      return !this.dialectData?.disabledFeatures?.alter?.dropConstraint
    },
    hasEdits() {
      return this.editCount > 0
    },
    editCount() {
      return this.newRows.length + this.removedRows.length
    },
    tableColumns(): ColumnDefinition[] {
      const withSchemas: Dialect[] = ['postgresql', 'sqlserver']
      const showSchema = withSchemas.includes(this.dialect)
      const editable = (cell) => this.newRows.includes(cell.getRow()) && !this.loading
      const results: ColumnDefinition[] = [
        {
          field: 'constraintName',
          title: "Name",
          widthGrow: 2,
          editable,
          editor: vueEditor(NullableInputEditorVue),

        },
        { 
          field: 'fromColumn',
          title: "Column",
          editable,
          editor: 'select',
          editorParams: {
            values: this.table.columns.map((c) => c.columnName)
          }
        },
        ...( showSchema ? [{
          field: 'toSchema',
          title: "FK Schema",
          editable,
          editor: 'select' as Editor,
          editorParams: {
            values: [...this.schemas]
          },
          cellEdited: (cell) => cell.getRow().getCell('toTable')?.setValue(null)
        }] : []),
        { 
          field: 'toTable',
          title: "FK Table",
          editable,
          editor: 'select',
          editorParams: {
            values: this.getTables
          },
          cellEdited: (cell) => cell.getRow().getCell('toColumn')?.setValue(null)
          
        },
        { 
          field: 'toColumn',
          title: "FK Column",
          editable,
          editor: 'select',
          editorParams: {
            values: this.getColumns
          },
        },
        { 
          field: 'onUpdate',
          title: "On Update",
          editor: 'select',
          editable,
          editorParams: {
            values: this.dialectData.constraintActions,
            defaultValue: 'NO ACTION'
          }
        },
        { 
          field: 'onDelete',
          title: 'On Delete',
          editable,
          editor: 'select',
          editorParams: {
            values: this.dialectData.constraintActions,
            defaultValue: 'NO ACTION',
          }
        },
      ]
      return this.canDrop ? [...results, trashButton(this.removeRow)] : results
    },
    tableData() {
      return this.properties.relations || []
    },
  },
  watch: {
    ...TabulatorStateWatchers,
    tableData() {
      if (this.tabulator) this.tabulator.replaceData(this.tableData)
    },
    hasEdits() {
      this.tabState.dirty = this.hasEdits
    }
  },
  methods: {
    isCellEditable(cell: CellComponent): boolean {
      return this.newRows.includes(cell.getRow())
    },
    getTables(cell: CellComponent): string[] {
        const schema = cell.getRow().getData()['toSchema']
        return schema ? 
          this.schemaTables.find((st) => st.schema === schema)?.tables.map((t) => t.name) : 
          this.tables.map((t) => t.name)
    },
    getColumns(cell: CellComponent): string[] {
      const data = cell.getRow().getData()
      const schema = data['toSchema']
      const table = data['toTable']
      if (!schema) {
        return this.tables.find((t: TableOrView) => t.name === table)?.columns.map((c: TableColumn) => c.columnName) || []
      } else {
        return this.tables.find((t: TableOrView) => 
          t.name === table && t.schema === schema
        )?.columns.map((c: TableColumn) => c.columnName) || []
      }
    },
    getPayload(): RelationAlterations {
      const additions: CreateRelationSpec[] = this.newRows.map((row: RowComponent) => {
        const data = row.getData()
        const payload: CreateRelationSpec = {
          constraintName: data.constraintName || undefined,
          fromColumn: data.fromColumn,
          toSchema: data.toSchema,
          toTable: data.toTable,
          toColumn: data.toColumn,
          onUpdate: data.onUpdate,
          onDelete: data.onDelete
        }
        return payload
      })
      const drops = this.removedRows.map((row: RowComponent) => {
        return row.getData()['constraintName'];        
      })
      return { additions, drops, table: this.table.name, schema: this.table.schema }
    },
    async addRow() {
      if (this.loading) return;
      const t = this.tabulator as Tabulator
      const row = await t.addRow({
        constraintName: `${this.table.name}_relation_${this.tabulator.getData().length + 1}` ,
        onUpdate: 'NO ACTION',
        onDelete: 'NO ACTION'
      })
      this.newRows.push(row);
      // TODO (fix): calling edit() on the column name cell isn't working here.
      // ideally we could drop users into the first cell to make editing easier
      // but right now if it fails it breaks the whole table.
    },
    removeRow(_e: any, cell: CellComponent) {
      if (this.loading) return
      const row = cell.getRow()
      if (this.newRows.includes(row)) {
        this.newRows = _.without(this.newRows, row)
        row.delete()
        return
      } else {
        this.removedRows = this.removedRows.includes(row) ?
          _.without(this.removedRows, row) : [...this.removedRows, row]
      }
    },
    async submitApply() {
      try {
        this.loading = true
        this.error = null
        const payload = this.getPayload()
        await this.connection.alterRelation(payload)
        this.$noty.success("Relations Updated")
        this.$emit('actionCompleted')
        this.newRows = []
        this.removedRows = []
        // this.$nextTick(() => this.initializeTabulator())
      } catch (ex) {
        log.error('submitting relations error', ex)
        this.error = ex
      } finally {
        this.loading = false
      }

    },
    submitSql() {
      const payload = this.getPayload()
      const sql = this.connection.alterRelationSql(payload)
      const formatted = format(sql, { language: FormatterDialect(this.dialect)})
      this.$root.$emit(AppEvent.newTab, formatted)
    },
    submitUndo() {
      this.newRows.forEach((r) => r.delete())
      this.newRows = []
      this.removedRows = []
    },
    initializeTabulator() {

      this.tabulator?.destroy()
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        columns: this.tableColumns,
        data: this.tableData,
        tooltips: true,
        placeholder: "No Relations",
        layout: 'fitColumns'
      })
      this.newRows = []
      this.removedRows = []
    }
  },
  mounted() {
    this.tabState.dirty = false
    this.initializeTabulator()
  }
})
</script>