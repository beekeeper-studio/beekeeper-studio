<template>
  <div class="table-info-table view-only">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert :error="error" v-if="error" />

        <div v-if="loading">
          <div class="alert alert-info">Applying changes...</div>
          <x-progressbar></x-progressbar>
        </div>
        <div class="content-wrap">
          <div class="table-subheader">
            <div class="table-title">
              <h2>Indexes</h2>
            </div>
            <span class="expand"></span>
            <div class="actions">
              <a @click.prevent="$emit('refresh')" class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
              <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
            </div>

          </div>
          <div class="table-indexes" ref="tabulator"></div>

        </div>
      </div>
      <div class="notices" v-if="notice">
        <div class="alert alert-info"><i class="material-icons-outlined">info</i> {{notice}}</div>
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
import Tabulator, { CellComponent, RowComponent } from 'tabulator-tables'
import data_mutators from '../../mixins/data_mutators'
import { TabulatorStateWatchers, trashButton, vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import StatusBar from '../common/StatusBar.vue'
import Vue from 'vue'
import _ from 'lodash'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import { CreateIndexSpec, FormatterDialect, IndexAlterations } from '@shared/lib/dialects/models'
import rawLog from 'electron-log'
import { format } from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '../common/ErrorAlert.vue'
import { TableIndex } from '@/lib/db/models'
import { mapGetters } from 'vuex'
const log = rawLog.scope('TableIndexVue')

interface State {
  tabulator: Tabulator
  newRows: RowComponent[]
  removedRows: RowComponent[],
  loading: boolean,
  error: any | null
}

export default Vue.extend({
  components: {
    StatusBar,
    ErrorAlert,
  },
  mixins: [data_mutators],
  props: ["table", "connection", "tabId", "active", "properties", 'tabState'],
  data(): State {
    return {
      tabulator: null,
      newRows: [],
      removedRows: [],
      loading: false,
      error: null,
    }
  },
  watch: {
    ...TabulatorStateWatchers,
    editCount() {
      this.tabState.dirty = this.editCount > 0
    }
  },
  computed: {
    ...mapGetters(['dialect']),
    notice() {
      return this.dialect === 'mysql' ? 'Only ascending indexes are supported in MySQL before version 8.0.' : null
    },
    indexColumnOptions() {
      const normal = this.table.columns.map((c) => c.columnName)
      const desc = this.table.columns.map((c) => `${c.columnName} DESC`)
      return [...normal, ...desc]
    },
    editCount() {
      const result = this.newRows.length + this.removedRows.length;
      return result
    },
    hasEdits() {
      return this.editCount > 0
    },
    tableData() {
      return (this.properties.indexes || []).map((i: TableIndex) => {
        return {
          ...i,
          columns: i.columns.map((c) => `${c.name}${c.order === 'DESC' ? ' DESC' : ''}`)
        }
      })
    },
    tableColumns() {
      const editable = (cell) => this.newRows.includes(cell.getRow()) && !this.loading
      return [
        {title: 'Id', field: 'id', widthGrow: 0.5},
        {
          title:'Name',
          field: 'name',
          editable,
          editor: vueEditor(NullableInputEditorVue),
          formatter: this.cellFormatter
        },
        {
          title: 'Unique',
          field: 'unique',
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable,
          },
          width: 80,
          editable,
          editor: vueEditor(CheckboxEditorVue)
        },
        {title: 'Primary', field: 'primary', formatter: vueFormatter(CheckboxFormatterVue), width: 85},
        {
          title: 'Columns',
          field: 'columns',
          editable,
          editor: 'select',
          formatter: this.cellFormatter,
          editorParams: {
            multiselect: true,
            values: this.indexColumnOptions,
          }
        },
        trashButton(this.removeRow)
      ]
    }
  },
  methods: {
    async addRow() {
      if (this.loading) return
      const tabulator = this.tabulator as Tabulator
      const name = `${this.table.name}_index_${this.tabulator.getData().length + 1}`
      const row = await tabulator.addRow({
        name,
        unique: true
      })
      this.newRows.push(row)
      // TODO (fix): calling edit() on the column name cell isn't working here.
      // ideally we could drop users into the first cell to make editing easier
      // but right now if it fails it breaks the whole table.
    },
    async removeRow(_e: any, cell: CellComponent) {
      if (this.loading) return
      const row = cell.getRow()
      if (this.newRows.includes(row)) {
        this.newRows = _.without(this.newRows, row)
        row.delete()
        return
      }
      
      this.removedRows = this.removedRows.includes(row) ? 
        _.without(this.removedRows, row) :
        [...this.removedRows, row]
    },
    clearChanges() {
      this.newRows = []
      this.removedRows = []
    },
    submitUndo() {
      this.newRows.forEach((r) => r.delete())
      this.clearChanges()
    },
    getPayload(): IndexAlterations {
        const additions = this.newRows.map((row: RowComponent) => {
          const data = row.getData()
          const columns = data.columns.map((c: string)=> {
            const order = c.endsWith('DESC') ? 'DESC' : 'ASC'
            const name = c.replaceAll(' DESC', '')
            return { name, order }
          })
          const payload: CreateIndexSpec = {
            unique: data.unique,
            columns,
            name: data.name || undefined
          }
          return payload
        })
      const drops = this.removedRows.map((row: RowComponent) => ({ name: row.getData()['name']}))
      return { additions, drops, table: this.table.name, schema: this.table.schema }
    },
    async submitApply() {
      try {
    
        this.loading = true
        this.error = null
        const payload = this.getPayload()

        await this.connection.alterIndex(payload)
        this.$noty.success("Indexes Updated")
        this.$emit('actionCompleted')
        this.clearChanges()
        // this.$nextTick(() => this.initializeTabulator())
      } catch (ex) {
        log.error('submitting index error', ex)
        this.error = ex
      } finally {
        this.loading = false
      }

    },
    submitSql() {
      const payload = this.getPayload()
      const sql = this.connection.alterIndexSql(payload)
      const formatted = format(sql, { language: FormatterDialect(this.dialect)})
      this.$root.$emit(AppEvent.newTab, formatted)
    },

    initializeTabulator() {
      this.clearChanges()
      // if (this.tabulator) this.tabulator.destroy()
      // this.tabulator = new Tabulator(this.$refs.tabulator, {
      //   data: this.tableData,
      //   columns: this.tableColumns,
      //   layout: 'fitColumns',
      //   placeholder: "No Indexes",
      //   resizableColumns: false,
      //   headerSort: false,
      // })
    }

  },
  mounted() {
    // this.initializeTabulator()
    this.tabState.dirty = false
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        data: this.tableData,
        columns: this.tableColumns,
        layout: 'fitColumns',
        placeholder: "No Indexes",
        resizableColumns: false,
        headerSort: false,
      })
  }
})
</script>