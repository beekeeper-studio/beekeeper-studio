<template>
  <div
    class="table-info-table"
    v-hotkey="hotkeys"
  >
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert
          :error="error"
          v-if="error"
        />

        <div class="table-subheader">
          <div class="table-title">
            <h2>Partitions</h2>
          </div>
          <slot />
          <span class="expand" />
          <div class="actions">
            <a
              @click.prevent="refreshPartitions"
              class="btn btn-link btn-fab"
              v-tooltip="`${ctrlOrCmd('r')} or F5`"
            ><i class="material-icons">refresh</i></a>
            <a
              v-if="editable"
              @click.prevent="addRow"
              class="btn btn-primary btn-fab"
              v-tooltip="ctrlOrCmd('n')"
            ><i class="material-icons">add</i></a>
          </div>
        </div>
        <div ref="tablePartitions" />
      </div>
    </div>

    <div class="expand" />
    <status-bar class="tablulator-footer">
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

<script lang="ts">
import Vue from 'vue';
import DataMutators from '../../mixins/data_mutators'
import { TabulatorFull, RowComponent, CellComponent } from 'tabulator-tables'
import _ from 'lodash';
import { TabulatorStateWatchers, vueEditor, trashButton } from '@shared/lib/tabulator/helpers'
import StatusBar from '../common/StatusBar.vue'
import ErrorAlert from '../common/ErrorAlert.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { AppEvent } from '@/common/AppEvent';
import { FormatterDialect } from '@shared/lib/dialects/models';
import { format } from 'sql-formatter';
import { mapState } from 'vuex';

export default Vue.extend({
	components: {
    StatusBar,
    ErrorAlert
  },
  mixins: [DataMutators],
  props: ['table', 'tabID', 'active', 'tabState', 'properties'],
  data() {
    return {
      tabulator: null,
      forceRedraw: false,
      newRows: [],
      removedRows: [],
      editedCells: [],
      expressionTemplate: null,
      error: null,
    }
  },
  watch: {
    hasEdits() {
      this.tabState.dirty = this.hasEdits;
    },
    ...TabulatorStateWatchers
  },
  computed: {
    ...mapState(['supportedFeatures', 'connection']),
    hotkeys() {
      if (!this.active) return {};
      const result = {};
      result['f5'] = this.refreshPartitions.bind(this)
      result[this.ctrlOrCmd('r')] = this.refreshPartitions.bind(this)
      if (this.editable) {
        result[this.ctrlOrCmd('n')] = this.addRow.bind(this)
        result[this.ctrlOrCmd('s')] = this.submitApply.bind(this)
        result[this.ctrlOrCmd('shift+s')] = this.submitSql.bind(this)
      }

      return result;
    },
    hasEdits() {
      return this.editCount > 0;
    },
    editCount() {
      return this.newRows.length + this.removedRows.length + this.editedCells.length;
    },
    tableColumns() {
      const result = [
        {
          title: 'Name',
          field: 'name',
          editor: vueEditor(NullableInputEditorVue),
          editable: this.isCellEditable.bind(this),
          formatter: this.cellFormatter
        },
        {
          title: 'Partition Expression',
          field: 'expression',
          cellEdited: this.cellEdited,
          editor: vueEditor(NullableInputEditorVue),
          editable: this.editable,
          formatter: this.cellFormatter,
          cssClass: this.editable ? 'editable' : '',
        },
        this.editable ? trashButton(this.removeRow) : null
      ].filter((x) => !!x);

      return result;
    },
    tableData() {
      // If this doesn't get done, tabulator gets very very angry
      return this.properties.partitions.map((p) => {
        return {
          ...p
        };
      });
    },
    editable() {
      return this.supportedFeatures.editPartitions;
    }
  },
  methods: {
    // Tabulator functions
    initializeTabulator() {
      if (this.tabulator) this.tabulator.destroy()
      this.tabulator = new TabulatorFull(this.$refs.tablePartitions, {
        columns: this.tableColumns,
        layout: 'fitColumns',
        columnDefaults: {
          title: '',
          tooltip: true,
          resizable: false,
          headerSort: false,
        },
        data: this.tableData,
        placeholder: "No Partitions",
      })
    },
    isCellEditable(cell: CellComponent) {
      return this.editable ? this.newRows.includes(cell.getRow()) : false;
    },
    cellEdited(cell: CellComponent) {
      if (this.expressionTemplate === '') this.loadExpressionTemplate(cell.getRow().getData())
      const rowIncluded = [...this.newRows, ...this.removedRows].includes(cell.getRow());
      const existingCell: CellComponent = this.editedCells.find((c) => c === cell);
      if (!rowIncluded && !existingCell) {
        this.editedCells.push(cell);
        return;
      }

      if (existingCell && existingCell.getInitialValue() === existingCell.getValue()) {
        this.editedCells = _.without(this.editedCells, existingCell);
      }
    },
    async refreshPartitions() {
      await this.$emit('refresh');
    },
    async addRow(): Promise<void> {
      const data = this.tabulator.getData();
      const name = `${this.table.name}_partition_${data.length + 1}`;
      const row: RowComponent = await this.tabulator.addRow({name, expression: this.expressionTemplate, num: 0});
      this.newRows.push(row);
    },
    async removeRow(_e: any, cell: CellComponent) {
      const row = cell.getRow()
      if (this.newRows.includes(row)) {
        this.newrows = _.without(this.newRows, row);
        row.delete();
        return;
      }
      if (this.removedRows.includes(row)) {
        this.removedRows = _.without(this.removedRows, row);
      } else {
        this.removedRows.push(row);
        const undoEdits = this.editedCells.filter((c) => row.getCells().includes(c));
        undoEdits.forEach((c) => {
          c.restoreInitialValue();
        });
        this.editedCells = _.without(this.editedCells, ...undoEdits);
      }
    },
    // Changes functions
    collectChanges() {
      const adds = this.newRows.map((row) => {
        return row.getData();
      });

      const alterations = this.editedCells.map((cell: CellComponent) => {
        const partitionName = cell.getRow().getCell('name').getValue();

        return {
          partitionName,
          newValue: cell.getValue()
        }
      });

      const detaches = this.removedRows.map((row) => {
        return row.getData().name;
      })

      return {
        table: this.table.name,
        adds,
        detaches,
        alterations
      };
    },
    async submitApply(): Promise<void> {
      try {
        this.error = null;
        const changes = this.collectChanges();
        await this.connection.alterPartition(changes);

        await this.$store.dispatch('updateTables');
        await this.refreshPartitions();
        this.clearChanges();
        this.$nextTick(() => this.initializeTabulator());
        this.$noty.success(`${this.table.name} Partitions Updated`);
      } catch(ex) {
        this.error = ex;
      }
    },
    async submitSql(): Promise<void> {
      try {
        this.error = null;
        const changes = this.collectChanges();
        const sql = await this.connection.alterPartitionSql(changes);
        const formatted = format(sql, { language: FormatterDialect(this.dialect)});
        this.$root.$emit(AppEvent.newTab, formatted);
      } catch(ex) {
        this.error = ex;
      }
    },
    submitUndo(): void {
      this.editedCells.forEach((c) => {
        c.restoreInitialValue()
      });
      this.newRows.forEach((r) => r.delete());
      this.clearChanges();
    },
    clearChanges() {
      this.newRows = [];
      this.removedRows = [];
      this.editedCells = [];
    },
    // Load a template for partition expressions based on previous partitions.
    loadExpressionTemplate(partition: any | null) {
      if (!partition || !partition.expression) {
        this.expressionTemplate = '';
        return
      }
      let template = partition.expression.replace(/\(.*\)/g, '()')
      if (template.includes('FROM'))
        template += ' TO ()';
      this.expressionTemplate = template;
    }
  },
  async mounted() {
    if (!this.active) this.forceRedraw = true;
    this.tabState.dirty = false;

    this.loadExpressionTemplate(this.properties.partitions[0] ?? null);
    this.initializeTabulator();
  }
})
</script>
