<template>
  <div
    class="table-info-table"
    v-hotkey="hotkeys"
  >
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert
          :error="error"
          :title="errorTitle"
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
          <x-progressbar />
        </div>

        <div class="content-wrap">
          <div class="table-subheader">
            <table-info-toolbar
              :search-suffix="structureFilterSuffix"
              filter-placeholder="Filter policies"
              @search="setStructureFilterQuery"
              @copy="copyStructure"
              @refresh="refreshPolicies"
            >
              <slot />
            </table-info-toolbar>
          </div>
          <div
            class="table-policies"
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
import _ from 'lodash'
import { TabulatorFull, CellComponent, ColumnDefinition, RowComponent } from 'tabulator-tables'
import { format } from 'sql-formatter'
import { mapGetters, mapState } from 'vuex'

import DataMutators from '../../mixins/data_mutators'
import StatusBar from '../common/StatusBar.vue'
import ErrorAlert from '../common/ErrorAlert.vue'
import TableInfoToolbar from './TableInfoToolbar.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { TabulatorStateWatchers, trashButton, vueEditor } from '@shared/lib/tabulator/helpers'
import { AlterPolicySpec, FormatterDialect, PolicyAlterations } from '@shared/lib/dialects/models'
import { TablePolicy } from '@/lib/db/models'
import { AppEvent } from '@/common/AppEvent'
import { SelectableCellMixin } from '@/mixins/selectableCell'
import { StructureCopyMixin } from '@/mixins/structureCopy'
import { StructureFilterMixin } from '@/mixins/structureFilter'
import { copyCellMenu } from '@/lib/menu/tableMenu'
import rawLog from '@bksLogger'

const log = rawLog.scope('TablePolicies')

/** Roles are one cell, so they're edited as a comma separated list. */
function parseRoles(value: string | null): string[] {
  return (value || '')
    .split(',')
    .map((role) => role.trim())
    .filter((role) => !!role)
}

export default Vue.extend({
  components: {
    StatusBar,
    ErrorAlert,
    TableInfoToolbar,
  },
  mixins: [DataMutators, SelectableCellMixin, StructureCopyMixin, StructureFilterMixin],
  props: ['table', 'tabId', 'active', 'tabState', 'properties'],
  data() {
    return {
      tabulator: null,
      forceRedraw: false,
      policies: [] as TablePolicy[],
      loaded: false,
      loading: false,
      removedRows: [] as RowComponent[],
      editedCells: [] as CellComponent[],
      error: null,
      errorTitle: null,
    }
  },
  watch: {
    ...TabulatorStateWatchers,
    // The mixin's handler keeps tabulator's redraw in sync, this one loads the
    // policies the first time the tab is actually looked at.
    active: [
      TabulatorStateWatchers.active,
      function () {
        if (this.active && !this.loaded) this.loadPolicies()
      },
    ],
    hasEdits() {
      this.tabState.dirty = this.hasEdits
    },
  },
  computed: {
    ...mapState(['connection', 'usedConfig']),
    ...mapGetters(['dialect', 'dialectData']),
    hotkeys() {
      if (!this.active) return {}
      return this.$vHotkeyKeymap({
        'general.refresh': this.refreshPolicies.bind(this),
        'general.save': this.submitApply.bind(this),
        'general.openInSqlEditor': this.submitSql.bind(this),
      })
    },
    editable() {
      return !this.usedConfig.readOnlyMode && !this.dialectData.disabledFeatures?.alter?.everything
    },
    notice() {
      if (!this.editable) return null
      return "A policy's command and permissive/restrictive setting can't be changed after it's created."
    },
    hasEdits() {
      return this.editCount > 0
    },
    editCount() {
      return this.removedRows.length + this.editedCells.length
    },
    tableData() {
      return this.policies.map((policy: TablePolicy) => ({
        name: policy.name,
        type: policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE',
        command: policy.command,
        roles: (policy.roles || []).join(', '),
        using: policy.using,
        check: policy.check,
      }))
    },
    tableColumns(): ColumnDefinition[] {
      // Only the name, roles and expressions can be altered in place. The rest
      // is fixed for the life of the policy, so it stays read only.
      const editable = (cell: CellComponent) =>
        this.editable && !this.loading && !this.removedRows.includes(cell.getRow())
      const editableColumn = (extra: Partial<ColumnDefinition> = {}): Partial<ColumnDefinition> =>
        this.editable
          ? {
            editable,
            editor: vueEditor(NullableInputEditorVue),
            cellEdited: this.cellEdited,
            cssClass: 'editable',
            ...extra,
          }
          : extra

      const results: ColumnDefinition[] = [
        {
          title: 'Name',
          field: 'name',
          widthGrow: 1.5,
          formatter: this.cellFormatter,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
          ...editableColumn(),
        },
        {
          title: 'Type',
          field: 'type',
          width: 120,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
        },
        {
          title: 'Command',
          field: 'command',
          width: 100,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
        },
        {
          title: 'Roles',
          field: 'roles',
          widthGrow: 1.5,
          formatter: this.cellFormatter,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
          ...editableColumn(),
        },
        {
          title: 'Using',
          field: 'using',
          widthGrow: 2,
          formatter: this.cellFormatter,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
          ...editableColumn(),
        },
        {
          title: 'With Check',
          field: 'check',
          widthGrow: 2,
          formatter: this.cellFormatter,
          contextMenu: copyCellMenu,
          cellDblClick: (_e, cell) => this.handleCellDoubleClick(cell),
          ...editableColumn(),
        },
      ]

      return this.editable ? [...results, trashButton(this.removeRow)] : results
    },
  },
  methods: {
    async loadPolicies() {
      this.loading = true
      try {
        const policies = await this.connection.listTablePolicies(this.table.name, this.table.schema)
        this.policies = policies || []
        this.error = null
        this.errorTitle = null
      } catch (ex) {
        log.error('unable to list policies', ex)
        this.policies = []
        this.setError(ex, 'Unable to read policies')
      } finally {
        this.loaded = true
        this.loading = false
      }
    },
    async refreshPolicies() {
      this.clearChanges()
      await this.loadPolicies()
    },
    setError(error: any, title: string) {
      this.error = error
      this.errorTitle = title
    },
    cellEdited(cell: CellComponent) {
      if (this.removedRows.includes(cell.getRow())) return

      const changed = cell.getValue() !== cell.getInitialValue()
      const tracked = this.editedCells.includes(cell)

      if (changed && !tracked) {
        this.editedCells = [...this.editedCells, cell]
      } else if (!changed && tracked) {
        this.editedCells = _.without(this.editedCells, cell)
      }
    },
    removeRow(_e: any, cell: CellComponent) {
      if (!this.editable || this.loading) return
      const row = cell.getRow()

      if (this.removedRows.includes(row)) {
        this.removedRows = _.without(this.removedRows, row)
        return
      }

      // A policy that's on its way out doesn't need its edits applied first.
      const undo = this.editedCells.filter((c) => row.getCells().includes(c))
      undo.forEach((c) => c.restoreInitialValue())
      this.editedCells = _.without(this.editedCells, ...undo)
      this.removedRows = [...this.removedRows, row]
    },
    submitUndo() {
      this.editedCells.forEach((c) => c.restoreInitialValue())
      this.clearChanges()
    },
    clearChanges() {
      this.removedRows = []
      this.editedCells = []
    },
    buildAlteration(row: RowComponent): AlterPolicySpec {
      const data = row.getData()
      const editedFields = this.editedCells
        .filter((c) => row.getCells().includes(c))
        .map((c) => c.getField())
      const originalName = row.getCell('name').getInitialValue()

      const result: AlterPolicySpec = { name: originalName }

      if (editedFields.includes('name')) {
        if (_.isEmpty(_.trim(data.name))) {
          throw new Error(`Policy ${originalName}: name cannot be empty`)
        }
        result.newName = _.trim(data.name)
      }

      if (editedFields.includes('roles')) {
        const roles = parseRoles(data.roles)
        if (!roles.length) {
          throw new Error(`Policy ${originalName}: roles cannot be empty. Use 'public' to apply the policy to every role.`)
        }
        result.roles = roles
      }

      // Postgres has no syntax for removing an expression from an existing
      // policy, so blanking one out has to be rejected rather than ignored.
      if (editedFields.includes('using')) {
        if (_.isEmpty(_.trim(data.using))) {
          throw new Error(`Policy ${originalName}: a USING expression can't be removed. Drop the policy and create it again instead.`)
        }
        result.using = _.trim(data.using)
      }

      if (editedFields.includes('check')) {
        if (_.isEmpty(_.trim(data.check))) {
          throw new Error(`Policy ${originalName}: a WITH CHECK expression can't be removed. Drop the policy and create it again instead.`)
        }
        result.check = _.trim(data.check)
      }

      return result
    },
    getPayload(): PolicyAlterations {
      const editedRows = _.uniq(this.editedCells.map((c: CellComponent) => c.getRow()))
      return {
        table: this.table.name,
        schema: this.table.schema,
        alterations: editedRows.map((row: RowComponent) => this.buildAlteration(row)),
        drops: this.removedRows.map((row: RowComponent) => ({
          name: row.getCell('name').getInitialValue(),
        })),
      }
    },
    async submitApply() {
      if (!this.editable || !this.hasEdits) return

      try {
        this.loading = true
        const payload = this.getPayload()
        await this.connection.alterPolicy(payload)
        this.error = null
        this.errorTitle = null
        this.clearChanges()
        this.$noty.success(`${this.table.name} Policies Updated`)
        await this.loadPolicies()
      } catch (ex) {
        log.error('applying policy changes failed', ex)
        this.setError(ex, 'Unable to update policies')
      } finally {
        this.loading = false
      }
    },
    async submitSql() {
      if (!this.editable || !this.hasEdits) return

      try {
        const payload = this.getPayload()
        const sql = await this.connection.alterPolicySql(payload)
        this.error = null
        this.errorTitle = null
        this.$root.$emit(AppEvent.newTab, format(sql, { language: FormatterDialect(this.dialect) }))
      } catch (ex) {
        this.setError(ex, 'Unable to build policy SQL')
      }
    },
    initializeTabulator() {
      if (this.tabulator) this.tabulator.destroy()
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        columns: this.tableColumns,
        data: this.tableData,
        layout: 'fitColumns',
        height: 'auto',
        columnDefaults: {
          title: '',
          tooltip: true,
          resizable: false,
          headerSort: false,
        },
        placeholder: 'No Policies',
      })
    },
  },
  mounted() {
    if (!this.active) this.forceRedraw = true
    this.tabState.dirty = false
    this.initializeTabulator()
    if (this.active) this.loadPolicies()
  },
  beforeDestroy() {
    if (this.tabulator) this.tabulator.destroy()
  },
})
</script>
