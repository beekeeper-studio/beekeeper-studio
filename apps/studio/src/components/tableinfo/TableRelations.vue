<template>
  <div
    class="table-info-table view-only"
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

        <!-- FK Suggestions Notice -->
        <div class="notices" v-if="showFkSuggestionNotice">
          <div class="alert alert-warning alert-flex">
            <div class="alert-left">
              <i class="material-icons-outlined">lightbulb</i>
              <span class="alert-message">{{ fkSuggestionMessage }}</span>
            </div>
            <button @click="openFkSuggestions" class="btn btn-suggestion">
              View Suggestions
            </button>
          </div>
        </div>

        <div class="table-subheader">
          <div class="table-title">
            <h2>Relations</h2>
          </div>
          <div class="expand" />
          <div class="actions">
            <a
              v-if="enabled && suggestedFks.length > 0"
              @click.prevent="openFkSuggestions"
              v-tooltip="'View Foreign Key naming suggestions'"
              class="btn btn-link btn-fab"
            ><i class="material-icons">auto_fix_high</i></a>
            <a
              @click.prevent="$emit('refresh')"
              v-tooltip="`${ctrlOrCmd('r')} or F5`"
              class="btn btn-link btn-fab"
            ><i class="material-icons">refresh</i></a>
            <a
              v-if="enabled && canAdd"
              @click.prevent="addRow"
              v-tooltip="ctrlOrCmd('n')"
              class="btn btn-primary btn-fab"
            ><i class="material-icons">add</i></a>
          </div>
        </div>
        <div
          class="table-relations"
          ref="tabulator"
        />
      </div>
    </div>

    <!-- FK Suggestions Modal -->
    <modal
      :name="fkSuggestionsModalName"
      class="vue-dialog beekeeper-modal fk-suggestions-modal"
      @opened="onModalOpened"
      @closed="onModalClosed"
      width="600"
      height="500"
      :scrollable="true"
    >
      <div class="dialog-content">
        <div class="suggestion-header">
          <h4>Foreign Key Naming Suggestions</h4>
          <p class="suggestion-subtitle">{{ suggestedFks.length }} foreign key{{ suggestedFks.length !== 1 ? 's' : '' }} with non-standard naming detected</p>
        </div>
        
        <div class="suggestion-body">
          <div 
            v-for="(suggestion, index) in suggestedFks" 
            :key="index"
            class="suggestion-item"
            :class="{ 'not-last': index < suggestedFks.length - 1 }"
          >
            <div class="suggestion-details">
              <div class="fk-info">
                <span class="fk-relationship">{{ suggestion.fromColumn }} → {{ suggestion.toTable }}.{{ suggestion.toColumn }}</span>
              </div>
              <div class="current-name-display">
                Current name:
                <span class="name-value current">{{ suggestion.currentName || '(no name)' }}</span>
              </div>
              <div class="suggested-name-display">
                Suggested name:
                <span class="name-value suggested">{{ suggestion.suggestedName }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="suggestion-actions">
          <button 
            @click="closeFkSuggestions"
            class="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </modal>

    <div class="expand" />

    <status-bar class="tabulator-footer" :active="active">
      <div class="flex flex-middle flex-right statusbar-actions">
        <slot name="footer" />
        <x-button
          v-if="hasEdits && !loading"
          class="btn btn-flat reset"
          @click.prevent="submitUndo"
        >
          Reset
        </x-button>
        <x-buttons
          v-if="hasEdits && !loading"
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
<script lang="ts">
import Vue from 'vue'
import { Tabulator, TabulatorFull, CellComponent, RowComponent, ColumnDefinition } from 'tabulator-tables'

import StatusBar from '../common/StatusBar.vue'
import { TabulatorStateWatchers, trashButton, vueEditor } from '@shared/lib/tabulator/helpers'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { mapGetters, mapState } from 'vuex'
import { CreateRelationSpec, Dialect, DialectTitles, FormatterDialect, RelationAlterations } from '@shared/lib/dialects/models'
import { TableColumn, TableOrView } from '@/lib/db/models'
import _ from 'lodash'
import { format } from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import rawLog from '@bksLogger'
import ErrorAlert from '../common/ErrorAlert.vue'
const log = rawLog.scope('TableRelations');
import { escapeHtml } from '@shared/lib/tabulator'
import { SelectableCellMixin } from '@/mixins/selectableCell';

interface FkSuggestion {
  currentName: string
  suggestedName: string
  fromColumn: string
  toTable: string
  toColumn: string
}

export default Vue.extend({
  mixins: [SelectableCellMixin],
  props: ["table", "tabId", "active", "properties", 'tabState'],
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
      loading: false,
      // FK Suggestions
      suggestedFks: [] as FkSuggestion[],
      showFkSuggestionNotice: false
    }
  },
  computed: {
    ...mapState(['tables', 'connection']),
    ...mapGetters(['schemas', 'dialect', 'schemaTables', 'dialectData']),
    enabled() {
      return !this.dialectData.disabledFeatures?.alter?.everything && !this.dialectData?.disabledFeatures?.relations;
    },
    hotkeys() {
      if (!this.active) return {}
      return this.$vHotkeyKeymap({
        'general.refresh': () => this.$emit('refresh'),
        'general.addRow': this.addRow.bind(this),
        'general.save': this.submitApply.bind(this),
        'general.openInSqlEditor': this.submitSql.bind(this)
      })
    },
    notice() {
      const results = []
      if (!this.canAdd) {
        results.push("Adding relations is not supported")
      }
      if (!this.canDrop) {
        results.push("Dropping constraints is not supported")
      }
      if (this.dialectData.notices?.infoRelations) {
        results.push(this.dialectData.notices.infoRelations)
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
    fkSuggestionMessage() {
      const count = this.suggestedFks.length
      if (count === 0) {
        return 'No Foreign Keys with non-standard naming detected.'
      }
      if (count === 1) {
        return '1 Foreign Key with non-standard naming detected.'
      }
      return `${count} Foreign Keys with non-standard naming detected.`
    },
    fkSuggestionsModalName() {
      return `fk-suggestions-${this.tabId}`
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
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
        },
        {
          field: 'fromColumn',
          title: "Column",
          editable,
          editor: 'list',
          editorParams: {
            // @ts-expect-error Incorrectly typed
            valuesLookup: () => this.table.columns.map((c) => escapeHtml(c.columnName))
          },
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
        },
        ...( showSchema ? [{
          field: 'toSchema',
          title: "FK Schema",
          editable,
          editor: 'list' as any,
          editorParams: {
            // @ts-expect-error Incorrectly typed
            valuesLookup: () => this.schemas.map((s) => escapeHtml(s))
          },
          cellEdited: (cell) => cell.getRow().getCell('toTable')?.setValue(null)
        }] : []),
        {
          field: 'toTable',
          title: "FK Table",
          editable,
          editor: 'list',
          editorParams: {
            // @ts-expect-error Incorrectly typed
            valuesLookup: this.getTables
          },
          cellEdited: (cell) => cell.getRow().getCell('toColumn')?.setValue(null),
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
        },
        {
          field: 'toColumn',
          title: "FK Column",
          editable,
          editor: 'list',
          editorParams: {
            // @ts-expect-error Incorrectly typed
            valuesLookup: this.getColumns
          },
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
        },
        {
          field: 'onUpdate',
          title: "On Update",
          editor: 'list',
          editable,
          editorParams: {
            values: this.dialectData.constraintActions,
            defaultValue: 'NO ACTION'
          },
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
        },
        {
          field: 'onDelete',
          title: 'On Delete',
          editable,
          editor: 'list',
          // @ts-expect-error Bad Type
          editorParams: {
            values: this.dialectData.constraintActions,
            defaultValue: 'NO ACTION',
          },
          cellDblClick: (e, cell) => this.handleCellDoubleClick(cell)
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
      this.$nextTick(() => {
        this.detectNonStandardForeignKeys()
      })
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
        this.schemaTables.find((st) => escapeHtml(st.schema) === schema)?.tables.map((t) => escapeHtml(t.name)) :
        this.tables.map((t) => escapeHtml(t.name))
    },
    findTable(schema: string | null, table: string): null | TableOrView {
      if (!schema) {
        return this.tables.find((t: TableOrView) => escapeHtml(t.name) === table)
      }

      return this.tables.find((t: TableOrView) =>
        escapeHtml(t.name) === table && escapeHtml(t.schema) === schema
      )
    },
    async getColumns(cell: CellComponent): Promise<string[]> {
      const data = cell.getRow().getData()
      const schema = data['toSchema']
      const table = data['toTable']
      let tableData = this.findTable(schema, table)

      if (tableData?.columns == null) {
        await this.$store.dispatch('updateTableColumns', tableData)
        tableData = this.findTable(schema, table)
      }

      const result = await tableData.columns.map((c: TableColumn) => escapeHtml(c.columnName)) || []
      console.log("getcolumns", result)
      return result
    },
    // FK Suggestions methods
    openFkSuggestions() {
      this.$modal.show(this.fkSuggestionsModalName)
    },
    closeFkSuggestions() {
      this.$modal.hide(this.fkSuggestionsModalName)
    },
    onModalOpened() {
      // Modal opened callback
    },
    onModalClosed() {
      // Modal closed callback
    },
    detectNonStandardForeignKeys() {
      if (!this.enabled || !this.tableData?.length) {
        this.suggestedFks = []
        this.showFkSuggestionNotice = false
        return
      }

      const suggestions: FkSuggestion[] = []

      this.tableData.forEach((relation: any) => {
        if (!relation.fromColumn || !relation.toTable || !relation.toColumn) {
          return
        }

        const suggestedName = this.suggestForeignKeyName(
          this.table.name,
          relation.toTable
        )

        const currentName = relation.constraintName
        if (currentName !== suggestedName) {
          const suggestion = {
            currentName: currentName,
            suggestedName,
            fromColumn: relation.fromColumn,
            toTable: relation.toTable,
            toColumn: relation.toColumn
          }
          
          suggestions.push(suggestion)
        }
      })

      this.suggestedFks = suggestions
      this.showFkSuggestionNotice = suggestions.length > 0
    },
    suggestForeignKeyName(fromTable: string, toTable: string): string {
      const cleanFromTable = fromTable.split('.').pop() || fromTable
      const cleanToTable = toTable.split('.').pop() || toTable
      
      return `FK_${cleanFromTable}_${cleanToTable}`
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
        await this.connection.alterRelation(payload);
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
    async submitSql() {
      const payload = this.getPayload()
      const sql = await this.connection.alterRelationSql(payload);
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
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        columns: this.tableColumns,
        data: this.tableData,
        columnDefaults: {
          title:'',
          tooltip: true,
          headerSort: false,
        },
        placeholder: "No Relations",
        layout: 'fitColumns',
        height: 'auto',
      })
      this.newRows = []
      this.removedRows = []
    }
  },
  mounted() {
    this.tabState.dirty = false
    this.initializeTabulator()
    this.$nextTick(() => {
      this.detectNonStandardForeignKeys()
    })
  },
  beforeDestroy() {
    this.tabulator?.destroy()
  }
})
</script>

<style scoped>
.fk-suggestions-modal .dialog-content {
  background: #2d2d2d;
  color: #ffffff;
  border-radius: 8px;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: #ffffff;
  color: #000000;
  border: 1px solid #555555;
}

.btn-secondary:hover {
  background: #d1d0d0;
  border-color: #666666;
}

.suggestion-header {
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid #404040;
  flex-shrink: 0;
}

.suggestion-header h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #ffffff;
}

.suggestion-subtitle {
  margin: 0;
  font-size: 14px;
  color: #cccccc;
}

.suggestion-body {
  padding: 16px 24px;
  flex: 1;
  overflow-y: auto;
  max-height: 350px;
}

.suggestion-item {
  padding: 16px 0;
}

.suggestion-item.not-last {
  border-bottom: 1px solid #404040;
  margin-bottom: 16px;
  padding-bottom: 24px;
}

.suggestion-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fk-info {
  margin-bottom: 8px;
}

.fk-relationship {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #81a1c1;
  background: #3c3c3c;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.current-name-display {
  font-size: 14px;
  color: #cccccc;
}

.suggested-name-display {
  font-size: 14px;
  color: #cccccc;
}

.name-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 15px;
  font-weight: 500;
  display: block;
  margin-top: 4px;
  margin-left: 4px;
  padding: 6px 8px;
  border-radius: 4px;

}

.name-value.current {
  color: #ffa500;

}

.name-value.suggested {
  color: #88c999;

}

.suggestion-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #404040;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* Notice styles */
.alert-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.alert-message {
  font-size: 15px;
  color: #000;
  font-weight: 500;
}

.btn-suggestion {
  background: #f1f1f1;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: bold;
  cursor: pointer;
  white-space: nowrap;
}

.btn-suggestion:hover {
  background-color: #e0e0e0;
}

.notices .alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
}

.notices .alert-warning {
  background-color: #fad83c;
  border: none;
  color: #000000;
}

.notices .alert i {
  flex-shrink: 0;
  font-size: 1.25rem;
}
</style>