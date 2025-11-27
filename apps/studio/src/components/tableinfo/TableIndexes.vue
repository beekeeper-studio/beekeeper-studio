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

        <div v-if="loading">
          <div class="alert alert-info">
            Applying changes...
          </div>
          <x-progressbar />
        </div>
        <div class="content-wrap">
          <div class="table-subheader">
            <div class="table-title">
              <h2>Indexes</h2>
            </div>
            <span class="expand" />
            <div class="actions">
              <a
                @click.prevent="$emit('refresh')"
                v-tooltip="`${ctrlOrCmd('r')} or F5`"
                class="btn btn-link btn-fab"
              ><i class="material-icons">refresh</i></a>
              <a
                v-if="enabled"
                @click.prevent="addRow"
                v-tooltip="ctrlOrCmd('n')"
                class="btn btn-primary btn-fab"
              ><i class="material-icons">add</i></a>
            </div>
          </div>
          <div
            class="table-indexes"
            ref="tabulator"
          />
        </div>
      </div>
    </div>

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
            v-if="hasSql"
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
import { Tabulator, TabulatorFull, RowComponent, CellComponent } from 'tabulator-tables'
import data_mutators from '../../mixins/data_mutators'
import { TabulatorStateWatchers, trashButton, vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import StatusBar from '../common/StatusBar.vue'
import Vue from 'vue'
import _ from 'lodash'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import { AdditionalMongoOrders, CreateIndexSpec, FormatterDialect, IndexAlterations, IndexColumn } from '@shared/lib/dialects/models'
import rawLog from '@bksLogger'
import { format } from 'sql-formatter'
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '../common/ErrorAlert.vue'
import { TableIndex } from '@/lib/db/models'
import { mapGetters, mapState } from 'vuex'
const log = rawLog.scope('TableIndexVue')
import { escapeHtml } from '@shared/lib/tabulator'
import { parseIndexColumn as mysqlParseIndexColumn } from '@/common/utils'
import { SelectableCellMixin } from '@/mixins/selectableCell';

interface State {
  mysqlTypes: string[]
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
  mixins: [data_mutators, SelectableCellMixin],
  props: ["table", "tabId", "active", "properties", 'tabState'],
  data(): State {
    return {
      mysqlTypes: ['mysql', 'mariadb', 'tidb'],
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
    ...mapState(['connectionType', 'connection', 'usedConfig']),
    ...mapGetters(['dialect', 'dialectData']),
    hasSql() {
      // FIXME (@day): no per db testing
      return this.connectionType !== 'mongodb';
    },
    enabled() {
      return !this.usedConfig.readOnlyMode && !this.dialectData.disabledFeatures?.alter?.everything && !this.dialectData.disabledFeatures.indexes;
    },
    hotkeys() {
      if (!this.active) return {}
      return this.$vHotkeyKeymap({
        'general.refresh': () => this.$emit('refresh'),
        'general.addRow': this.addRow.bind(this),
        'general.save': this.submitApply.bind(this),
        'general.openInSqlEditor': this.submitSql.bind(this),
      })
    },
    notice() {
      return this.dialectData.notices?.infoIndexes;
    },
    indexColumnOptions() {
      const normal = this.table.columns.map((c) => escapeHtml(c.columnName))
      if (this.dialectData.disabledFeatures?.index?.desc) {
        return normal
      }
      const desc = this.table.columns.map((c) => `${escapeHtml(c.columnName)} DESC`)

      let additional = [];
      // FIXME (@day): no per-db testing
      if (this.connectionType === 'mongodb') {
        AdditionalMongoOrders.forEach((o) => {
          const add = this.table.columns.map((c) => `${escapeHtml(c.columnName)} ${o.toUpperCase()}`);
          additional.push(...add)
        })
      }

      return [...normal, ...desc, ...additional]
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
          info: i.nullsNotDistinct ? 'NULLS NOT DISTINCT' : undefined,
          columns: i.columns.map((c: IndexColumn) => {
            // In mysql, we can specify the prefix length
            if (this.mysqlTypes.includes(this.connectionType) && !_.isNil(c.prefix)) {
              return `${c.name}(${c.prefix})${c.order === 'DESC' ? ' DESC' : ''}`
            }
            if (this.dialectData.disabledFeatures?.index?.desc) {
              return c.name
            }
            return `${c.name}${c.order === 'DESC' ? ' DESC' : ''}`
          })
        }
      })
    },
    tableColumns() {
      const editable = (cell) => this.newRows.includes(cell.getRow()) && !this.loading
      // FIXME (@day): no per-db testing
      const editableName = (cell) => this.newRows.includes(cell.getRow()) && !this.loading && this.dialect != 'mongodb'
      const result = [
        (this.dialectData?.disabledFeatures?.index?.id ? null : {title: 'Id', field: 'id', widthGrow: 0.5, cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell)}),
        {
          title:'Name',
          field: 'name',
          editable: editableName,
          editor: vueEditor(NullableInputEditorVue),
          formatter: this.cellFormatter,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
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
          editor: vueEditor(CheckboxEditorVue),
        },
        (this.dialectData?.disabledFeatures?.index?.primary ? null : {title: 'Primary', field: 'primary', formatter: vueFormatter(CheckboxFormatterVue), width: 85}),
        // TODO (@day): fix
        (
          this.connection.supportedFeatures().indexNullsNotDistinct
            ? { title: 'Info', field: 'info' }
            : null
        ),
        {
          title: 'Columns',
          field: 'columns',
          editable,
          editor: 'list',
          formatter: this.cellFormatter,
          editorParams: {
            multiselect: true,
            values: this.indexColumnOptions,
            autocomplete: true,
            listOnEmpty: true,
            freetext: true,
          },
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell)
        },
        this.usedConfig.readOnlyMode ? null : trashButton(this.removeRow)
      ]

      return result.filter((c) => c !== null)
    }
  },
  methods: {
    async addRow() {
      if (this.loading || this.usedConfig.readOnlyMode) return
      const tabulator = this.tabulator as Tabulator
      // mongo doesn't have custom names for sql, they're auto generated
      // FIXME (@day): no per-db testing
      const name = this.dialect == 'mongodb' ? '' : `${this.table.name}_index_${this.tabulator.getData().length + 1}`
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
      if (this.loading || this.usedConfig.readOnlyMode) return
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
    validateNewRows() {
      this.newRows.forEach((row: RowComponent) => {
        const data = row.getData()
        if (_.isEmpty(data.name)) {
          throw new Error('Name cannot be empty')
        }
        if (_.isEmpty(data.columns)) {
          throw new Error('Columns cannot be empty')
        }
      })
    },
    getPayload(): IndexAlterations {
        this.validateNewRows()
        const additions = this.newRows.map((row: RowComponent) => {
          const data = row.getData()
          let dataColumns: string[]
          try {
            dataColumns = JSON.parse(data.columns)
          } catch (e) {
            dataColumns = [data.columns]
          }
          const columns = dataColumns.map((c: string)=> {
            if (this.mysqlTypes.includes(this.connectionType)) {
              return mysqlParseIndexColumn(c)
            }
            if (this.dialectData.disabledFeatures?.index?.desc) {
              return { name: c } as IndexColumn
            }
            let order = c.endsWith('DESC') ? 'DESC' : 'ASC'
            const addOrder = AdditionalMongoOrders.find((o) => c.toLowerCase().endsWith(o.toLowerCase()));
            if (addOrder) order = addOrder;

            let name = c.replaceAll(' DESC', '')
            name = AdditionalMongoOrders.reduce((n, o) => n.replaceAll(` ${o.toUpperCase()}`, ''), name);
            return { name, order } as IndexColumn
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
        this.error = null
        // this.$nextTick(() => this.initializeTabulator())
      } catch (ex) {
        log.error('submitting index error', ex)
        this.error = ex
      } finally {
        this.loading = false
      }

    },
    async submitSql() {
      if (!this.hasSql) return;
      try {
        const payload = this.getPayload()
        const sql = await this.connection.alterIndexSql(payload)
        const formatted = format(sql, { language: FormatterDialect(this.dialect)})
        this.error = null
        this.$root.$emit(AppEvent.newTab, formatted)
      } catch (e) {
        this.error = e
      }
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
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        data: this.tableData,
        columns: this.tableColumns,
        layout: 'fitColumns',
        placeholder: "No Indexes",
        height: 'auto',
        columnDefaults: {
          title: '',
          resizable: false,
          headerSort: false,
        },
      })
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  }
})
</script>
