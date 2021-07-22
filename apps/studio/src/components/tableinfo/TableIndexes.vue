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
              <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
            </div>

          </div>
          <div class="table-indexes" ref="tabulator"></div>

        </div>
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
import { CreateIndexSpec, DropIndexSpec } from '@shared/lib/dialects/models'
import rawLog from 'electron-log'
import sqlFormatter from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '../common/ErrorAlert.vue'
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
  props: ["table", "connection", "tabId", "active", "properties"],
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
    ...TabulatorStateWatchers
  },
  computed: {
    editCount() {
      return this.newRows.length + this.removedRows.length;
    },
    hasEdits() {
      return this.editCount > 0
    },
    tableData() {
      return this.properties.indexes || []
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
            values: this.table.columns.map((c) => c.columnName)
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
      row.getElement().classList.add('inserted')
      this.newRows.push(row)
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
    getPayload(): {additions: CreateIndexSpec[], drops: DropIndexSpec[]} {
        const additions = this.newRows.map((row: RowComponent) => {
          const data = row.getData()
          const payload: CreateIndexSpec = {
            table: this.table.name,
            schema: this.table.schema || undefined,
            unique: data.unique,
            columns: data.columns,
            name: data.name || undefined
          }
          return payload
        })
        const drops = this.removedRows.map((row: RowComponent) => ({ name: row.getData()['name']}))
      return { additions, drops }
    },
    async submitApply() {
      try {
    
        this.loading = true
        this.error = null
        const { additions, drops } = this.getPayload()

        await this.connection.alterIndex(additions, drops)
        this.$noty.success("Indexes Updated")
        this.$emit('actionCompleted')
        this.$nextTick(() => this.initializeTabulator())
      } catch (ex) {
        log.error('submitting index error', ex)
        this.error = ex
      } finally {
        this.loading = false
      }

    },
    submitSql() {
      const { additions, drops } = this.getPayload()
      const sql = this.connection.alterIndexSql(additions, drops)
      const formatted = sqlFormatter.format(sql)
      this.$root.$emit(AppEvent.newTab, formatted)
    },

    initializeTabulator() {
      this.clearChanges()
      if (this.tabulator) this.tabulator.destroy()
      this.tabulator = new Tabulator(this.$refs.tabulator, {
        data: this.tableData,
        columns: this.tableColumns,
        layout: 'fitColumns',
        placeholder: "No Indexes",
        resizableColumns: false,
        headerSort: false,
      })
    }

  },
  mounted() {
    this.initializeTabulator()
  }
})
</script>