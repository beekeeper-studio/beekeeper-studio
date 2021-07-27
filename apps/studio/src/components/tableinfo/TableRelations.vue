<template>
  <div class="table-info-table view-only">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <div class="table-subheader">
          <div class="table-title">
            <h2>Relations</h2>
          </div>
          <div class="expand"></div>
          <div class="actions">
            <a @click.prevent="addRow" class="btn btn-flat btn-icon btn-small"><i class="material-icons">add</i> Relation</a>
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
import { Dialect, FormatterDialect } from '@shared/lib/dialects/models'
import { TableColumn, TableKey, TableOrView } from '@/lib/db/models'
import _ from 'lodash'
import { format } from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import rawLog from 'electron-log'
const log = rawLog.scope('TableRelations');

export default Vue.extend({
  props: ["table", "connection", "tabId", "active", "properties", 'tabState'],
  components: {
    StatusBar
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
      return [
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
        trashButton(this.removeRow)
      ]
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
    getPayload() {
      const additions: TableKey[] = this.newRows.map((row: RowComponent) => {
        const data = row.getData()
        const payload: TableKey = {
          constraintName: data.constraintName || undefined,
          fromSchema: this.table.schema,
          fromTable: this.table.name,
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
        return {
          table: this.table.name,
          schema: this.table.schema,
          constraintName: row.getData()['constraintName']
        }
        
      })
      return { additions, drops }
    },
    async addRow() {
      if (this.loading) return;
      const t = this.tabulator as Tabulator
      const row = await t.addRow({
        constraintName: `${this.table.name}_relation_${this.tabulator.getData().length + 1}` ,
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      })
      this.newRows.push(row);
      setTimeout(() => row.getCells()[0].edit(), 50)
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
        const { additions, drops } = this.getPayload()
        await this.connection.alterRelation(additions, drops)
        this.$noty.success("Relations Updated")
        this.$emit('actionCompleted')
        this.$nextTick(() => this.initializeTabulator())
      } catch (ex) {
        log.error('submitting relations error', ex)
        this.error = ex
      } finally {
        this.loading = false
      }

    },
    submitSql() {
      const { additions, drops } = this.getPayload()
      const sql = this.connection.alterRelationSql(additions, drops)
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
    }
  },
  mounted() {
    this.initializeTabulator()
  }
})
</script>