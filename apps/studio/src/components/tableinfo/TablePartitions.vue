<template>
  <div class="table-info-table" v-hotkey="hotkeys">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert :error="error" v-if="error"></error-alert>
        <!-- Notices here -->

        <div class="table-subheader">
          <div class="table-title">
            <h2>Partitions</h2>
          </div>
          <slot />
          <span class="expand"> </span>
          <div class="actions">
            <a @click.prevent="refreshPartitions" class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
            <a @click.prevent="addRow" class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
          </div>
        </div>
        <div ref="tablePartitions"></div>
      </div>
    </div>

    <div class="expand" /> 
    <status-bar class="tablulator-footer">
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
import Vue from 'vue';
import { mapGetters } from 'vuex';
import DataMutators from '../../mixins/data_mutators'
import { TabulatorFull, Tabulator } from 'tabulator-tables'
type RowComponent = Tabulator.RowComponent; 
type CellComponent = Tabulator.CellComponent;
import _ from 'lodash';
import { TabulatorStateWatchers, vueEditor, trashButton } from '@shared/lib/tabulator/helpers'
import StatusBar from '../common/StatusBar.vue'
import ErrorAlert from '../common/ErrorAlert.vue'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'
import { AppEvent } from '@/common/AppEvent';
import { FormatterDialect } from '@shared/lib/dialects/models';
import { format } from 'sql-formatter';

export default Vue.extend({
	components: {
    StatusBar,
    ErrorAlert
  },
  mixins: [DataMutators],
  props: ['table', 'connection', 'tabID', 'active', 'tabState'],
  data() {
    return {
      tabulator: null,
      forceRedraw: false,
      newRows: [],
      removedRows: [],
      editedCells: [],
      expressionTemplate: null,
      error: null
    }
  },
  watch: {
    hasEdits() {
      this.tabState.dirty = this.hasEdits;
    },
    ...TabulatorStateWatchers
  },
  computed: {
    ...mapGetters([]),
    hotkeys() {
      if (!this.active) return {};
      const result = {};
      result['f5'] = this.refreshPartitions.bind(this)
      result[this.ctrlOrCmd('n')] = this.addRow.bind(this)
      result[this.ctrlOrCmd('r')] = this.refreshPartitions.bind(this)
      result[this.ctrlOrCmd('s')] = this.submitApply.bind(this)
      result[this.ctrlOrCmd('shift+s')] = this.submitSql.bind(this)

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
          editable: true,
          // formatter: this.cellFormatter,
          cssClass: 'editable',
          cellEditing: (cell) => console.log('Cell clicked: ', cell.getRow().getCells())
        },
        {
          title: 'Number of Records',
          field: 'num',
          cssClass: 'read-only never-editable'
        },
        trashButton(this.removeRow)
      ]

      return result;
    },
    tableData() {
      // If this doesn't get done, tabulator gets very very angry
      return this.table.partitions.map((p) => {
        return {
          ...p
        };
      });
    }
  },
  methods: {
    isCellEditable(cell: CellComponent) {
      return this.newRows.includes(cell.getRow());
    },
    cellEdited(cell: CellComponent) {
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
    async refreshPartitions() {
      await this.$emit('refresh');
    },
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
    async submitApply(): Promise<void> {
      try {
        this.error = null;
        const changes = this.collectChanges();
        await this.connection.alterPartition(changes);

        this.clearChanges();
        // TODO (day): update tables when needed
        await this.$store.dispatch('updateTablePartitions', this.table);
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
    loadExpressionTemplate() {
      let template = this.table.partitions[0].expression.replace(/\(.*\)/g, '()')
      if (template.includes('FROM'))
        template += ' TO ()';
      this.expressionTemplate = template;
    }
  },
  async mounted() {
    if (!this.active) this.forceRedraw = true;
    this.tabState.dirty = false;

    this.loadExpressionTemplate();
    this.initializeTabulator();
  }
})
</script>
