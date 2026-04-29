<template>
  <div
    class="result-table"
    :class="{ 'hidden-filter': hiddenFilter }"
    v-hotkey="keymap"
  >
    <editor-modal
      ref="editorModal"
      :binary-encoding="$bksConfig.ui.general.binaryEncoding"
      @save="onSaveEditorModal"
    />
    <form
      class="table-search-wrapper table-filter"
      @submit.prevent="searchHandler"
      v-hotkey="tableFilterKeymap"
    >
      <div class="input-wrapper filter">
        <input
          type="text"
          v-model="filterValue"
          ref="filterInput"
          class="form-control filter-value"
          placeholder="Search Results"
        >
        <button
          type="button"
          class="clear btn-link"
          title="clear search filter"
          @click.prevent="clearSearchFilters"
        >
          <i class="material-icons">cancel</i>
        </button>
      </div>
      <button
        type="submit"
        class="btn btn-primary btn-fab"
        title="filter results table"
      >
        <i class="material-icons">search</i>
      </button>
      <button
        class="close-btn btn btn-flat btn-fab"
        title="Close filter"
        @click="closeTableFilter"
      >
        <i class="material-icons">close</i>
      </button>
    </form>
    <div
      ref="tabulator"
      class="spreadsheet-table"
    />
  </div>
</template>

<script lang="ts">
  import _ from 'lodash'
  import dateFormat from 'dateformat'
  import Converter from '../../mixins/data_converter'
  import Mutators from '../../mixins/data_mutators'
  import { escapeHtml, FormatterParams } from '@shared/lib/tabulator'
  import { dialectFor, FormatterDialect } from '@shared/lib/dialects/models'
  import { FkLinkMixin } from '@/mixins/fk_click'
  import MagicColumnBuilder from '@/lib/magic/MagicColumnBuilder'
  import Papa from 'papaparse'
  import { mapState, mapGetters } from 'vuex'
  import { markdownTable } from 'markdown-table'
  import intervalParse from 'postgres-interval'
  import * as td from 'tinyduration'
  import { copyRanges, copyActionsMenu, commonColumnMenu, resizeAllColumnsToFitContent, resizeAllColumnsToFixedWidth, createMenuItem, pasteRange } from '@/lib/menu/tableMenu';
  import { tabulatorForTableData } from '@/common/tabulator';
  import EditorModal from '../tableview/EditorModal.vue'
  import { AppEvent } from "@/common/AppEvent";
  import XLSX from 'xlsx';
  import { parseRowDataForJsonViewer } from '@/lib/data/jsonViewer'
  import { vueEditor } from '@shared/lib/tabulator/helpers';
  import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue';
  import rawLog from '@bksLogger';
  import { FieldDescriptor, FieldEditData, FieldReadOnlyReasonStr, NgQueryResult, TableUpdate } from '@/lib/db/models'
  import { CellComponent, RangeComponent, RowComponent } from 'tabulator-tables'
  import { PropType } from 'vue'
  import { format } from 'sql-formatter'
  import pluralize from 'pluralize'
import { stringToTypedArray } from '@/common/utils'

  const log = rawLog.scope('ResultTable');

  type TableUpdatePayload = TableUpdate & { key: string, field: string, oldValue: any };

  type CellData = { cell: CellComponent, data: FieldEditData };

  type Filter = {
    field: string,
    type: string,
    value: string
  }

  type ClassTracker = {
    edited: Set<string>,
    editError: Set<string>,
    editSuccess: Set<string>,
  }

  export default {
    components: { EditorModal },
    mixins: [Converter, Mutators, FkLinkMixin],
    data() {
      return {
        tabulator: null,
        actualTableHeight: '100%',
        selectedRowData: {},
        filterValue: '',
        selectedRowPosition: -1,
        hiddenFilter: true,
        pendingChanges: {
          updates: [],
          deletes: []
        },
        internalClassTrackerColumn: "__beekeeper_internal_class_tracker",
        propogatedChangesFilters: new Map<string, Filter[]>(),
        fieldOriginalClassMap: new Map<string, string>(),
        saveError: null,
      }
    },
    props: {
      result: Object as PropType<NgQueryResult>,
      editData: Map as PropType<Map<string, FieldEditData>>,
      editingData: Boolean,
      tableHeight: Number,
      query: Object,
      active: Boolean,
      tab: Object,
      focus: Boolean,
      isManualCommit: Boolean,
      binaryEncoding: String as PropType<"hex" | "base64">
    },
    watch: {
      active() {
        if (!this.tabulator) return;
        if (this.active) {
          this.tabulator.restoreRedraw()
          this.$nextTick(() => {
            this.tabulator.redraw()
          })
        } else {
          this.tabulator.blockRedraw()
        }
      },
      result() {
        // This is better than just setting data because
        // the whole dataset has changed.
        this.initializeTabulator()
      },
      tableHeight() {
        this.tabulator.setHeight(this.actualTableHeight)
      },
      focus() {
        if (!this.focus) return
        this.triggerFocus()
        this.scrollToRangeIfOutOfView()
      }
    },
    computed: {
      ...mapState(['usedConfig', 'defaultSchema', 'connectionType', 'connection']),
      ...mapGetters(['isUltimate', 'dialectData', 'dialect']),
      ...mapGetters('popupMenu', ['getExtraPopupMenu']),
      queryDialect() {
        return this.dialectData?.queryDialectOverride ?? this.dialect;
      },
      keymap() {
        return this.$vHotkeyKeymap({
          'queryEditor.copyResultSelection': this.copySelection.bind(this),
          'queryEditor.openTableFilter': this.focusOnFilterInput.bind(this),
          'general.save': this.saveChanges.bind(this),
          'general.openInSqlEditor': this.copyToSql.bind(this),
          'resultTable.openEditorModal': this.openEditorMenuByShortcut.bind(this)
        });
      },
      tableFilterKeymap() {
        return this.$vHotkeyKeymap({
          'queryEditor.closeTableFilter': this.closeTableFilter.bind(this),
        });
      },
      tableData() {
          return this.dataToTableData(this.result, this.tableColumns)
      },
      tableTruncated() {
          return this.result.truncated
      },
      pendingChangesCount() {
        return this.pendingChanges.updates.length;
      },
      pendingChangesString() {
        const updateStrings = Object.entries(_.groupBy(this.pendingChanges.updates, (v: TableUpdatePayload) => {
          const schema = v.schema ? `${v.schema}.` : "";
          return `${schema}${v.table}`
        })).map(([table, updates]) => {
          return `${pluralize('update', updates.length, true)} to ${table}`;
        });

        const lastUpdate = updateStrings.pop();
        return updateStrings.length > 0 ?
          `${updateStrings.join(', ')}, and ${lastUpdate}` :
          lastUpdate || '';
      },
      hasPendingChanges() {
        return this.pendingChangesCount > 0
      },
      hasPendingUpdates() {
        return this.pendingChanges.updates.length > 0
      },
      tableColumns() {
        const results = this.result.fields.flatMap((field, index) => this.createColumnFromProps(field, index));

        const result = {
          title: this.internalClassTrackerColumn,
          field: this.internalClassTrackerColumn,
          maxWidth: this.$bksConfig.ui.tableTable.maxColumnWidth,
          maxInitialWidth: this.$bksConfig.ui.tableTable.maxInitialWidth,
          cellEditCancelled: cell => cell.getRow().normalizeHeight(),
          formatter: this.cellFormatter,
          visible: false,
          clipboard: false,
          print: false,
          download: false
        }

        results.push(result);
        return results;
      },
      columnIdTitleMap() {
        const result = {}
        this.tableColumns.forEach((column) => {
          result[column.field] = column.title
        })
        return result
      },
      tableId() {
        // the id for a tabulator table
        if (!this.usedConfig.id) return null;

        const workspace = 'workspace-' + this.worskpaceId
        const connection = 'connection-' + this.usedConfig.id
        const table = 'table-' + this.result.tableName
        const columns = 'columns-' + this.result.fields.reduce((str, field) => `${str},${field.name}`, '')
        return `${workspace}.${connection}.${table}.${columns}`
      },
      selectedRowId() {
        return `${this.tableId ? `${this.tableId}.` : ''}tab-${this.tab.id}.row-${this.selectedRowPosition}`
      },
      rootBindings() {
        return [
          { event: AppEvent.switchedTab, handler: this.handleSwitchedTab },
        ]
      },
    },
    methods: {
      initializeTabulator() {
        if (this.tabulator) {
          this.tabulator.destroy()
        }
        this.propogatedChangesFilters = new Map<string, Filter[]>();
        this.fieldOriginalClassMap = new Map<string, string>();
        this.resetPendingChanges();

        this.tabulator = tabulatorForTableData(this.$refs.tabulator, {
          table: this.result.tableName,
          schema: this.result.schema,
          persistenceID: this.tableId,
          data: this.tableData, //link data to table
          columns: this.tableColumns, //define table columns
          height: this.actualTableHeight,
          downloadConfig: {
            columnHeaders: true
          },
          onRangeChange: this.handleRangeChange,
          rowFormatter: this.rowFormatter,
          rowHeader: {
            // @ts-ignore
            contextMenu: (_e, cell) => {
              return [
                ...copyActionsMenu({
                  ranges: cell.getRanges(),
                  table: this.result.tableName || "mytable",
                  schema: this.result.schema,
                }),
                ...this.getExtraPopupMenu('results.rowHeader', { transform: "tabulator" }),
              ];
            },
            headerContextMenu: (_e, column) => {
              return [
                ...copyActionsMenu({
                  ranges: column.getTable().getRanges(),
                  table: this.result.tableName || "mytable",
                  schema: this.result.schema,
                }),
                { separator: true },
                resizeAllColumnsToFitContent,
                resizeAllColumnsToFixedWidth,
                ...this.getExtraPopupMenu('results.corner', { transform: "tabulator" }),
              ];
            },
          },
        });

        this.tabulator.on('cellEdited', this.cellEdited);
      },
      rowFormatter(row: RowComponent) {
        const data = row.getData();
        const classTracker: ClassTracker = data[this.internalClassTrackerColumn];
        if (!classTracker) return
        const hasReset = [];

        if (classTracker.edited && _.isSet(classTracker.edited)) {
          this.setClassForCells(row, classTracker.edited, 'edited', hasReset);
        }
        if (classTracker.editError && _.isSet(classTracker.editError)) {
          this.setClassForCells(row, classTracker.editError, 'edit-error', hasReset);
        }
        if (classTracker.editSuccess && _.isSet(classTracker.editSuccess)) {
          this.setClassForCells(row, classTracker.editSuccess, 'edit-success', hasReset);
        }
      },
      setClassForCells(row: RowComponent, fieldsWithClass: string[], classToAdd: string, hasReset: string[]) {
        for (const field of fieldsWithClass) {
          const element = row.getCell(field)?.getElement();
          if (!element) continue;
          if (!hasReset.includes(field)) {
            element.classList.value = this.fieldOriginalClassMap.get(field);
            hasReset.push(field);
          }
          element.classList.add(classToAdd);
        }
      },
      setAsNullMenuItem(range: RangeComponent) {
        const areAllCellsReadOnly = range
          .getColumns()
          .every((col) => !this.cellEditCheck(col));
        return {
          label: createMenuItem("Set as NULL"),
          action: () => {
            const targets = range.getCells().flat().map((cell) => ({
              row: cell.getRow(),
              field: cell.getField()
            }));

            for (const { row, field } of targets) {
              const cell = row.getCell(field);
              if (!cell) continue;
              if (this.cellEditCheck(cell)) cell.setValue(null);
            }
          },
          disabled: areAllCellsReadOnly || !this.editingData,
        }
      },
      openEditorMenuByShortcut() {
        const range: RangeComponent = _.last(this.tabulator.getRanges())
        const cell = range.getCells().flat()[0];
        // (copied from TableTable.vue)
        // FIXME maybe we can avoid calling child methods directly like this?
        // it should be done by calling an event using this.$modal.show(modalName)
        // or this.$trigger(AppEvent.something) if possible
        this.openCellEditorModal(cell, !this.cellEditCheck(cell))
      },
      openEditorMenu(cell: CellComponent) {
        const isReadOnly = !this.cellEditCheck(cell);
        let keybind = this.$bksConfig.getKeybindings("context-menu", 'resultTable.openEditorModal');
        keybind = Array.isArray(keybind) ? keybind[0] : keybind;
        return {
          label: createMenuItem(isReadOnly ? "View in modal" : "Edit in modal", keybind),
          action: () => {
            this.openCellEditorModal(cell, isReadOnly)
          }
        }
      },
      openCellEditorModal(cell: CellComponent, isReadOnly: boolean) {
        const eventParams = { cell, isReadOnly };
        this.$refs.editorModal.openModal(cell.getValue(), undefined, eventParams)
      },
      onSaveEditorModal(content: string, _l: any, cell: CellComponent){
        const editData = this.editData?.get(cell.getField());
        const isBinary = editData?.bksField?.bksType === 'BINARY' || _.isTypedArray(cell.getValue());

        let value = content;
        if (isBinary) {
          value = stringToTypedArray(content);
        }

        cell.setValue(value);
      },
      createColumnFromProps(column: FieldDescriptor, index: number) {
        const columnWidth = this.result.fields.length > 30 ? this.$bksConfig.ui.tableTable.defaultColumnWidth : undefined

        const filterMenuItem = {
          label: createMenuItem("Search results"),
          action: () => {
            this.focusOnFilterInput()
          }
        }

        const cellMenu = (_e, cell: CellComponent) => {
          const ranges = cell.getRanges();
          const range = _.last(ranges);

          return [
            this.openEditorMenu(cell),
            this.setAsNullMenuItem(range),
            { separator: true },
            ...copyActionsMenu({
              ranges: cell.getRanges(),
              table: this.result.tableName,
              schema: this.defaultSchema,
            }),
            { separator: true },
            {
              label: createMenuItem("Paste", "Control+V"),
              action: () => {
                pasteRange(range);
              },
            },
            { separator: true },
            filterMenuItem,
            ...this.getExtraPopupMenu('results.cell', { transform: "tabulator" }),
          ]
        }

        const columnMenu = (_e, column) => {
          return [
            ...copyActionsMenu({
              ranges: column.getRanges(),
              table: this.result.tableName,
              schema: this.defaultSchema,
            }),
            { separator: true },
            ...commonColumnMenu,
            { separator: true },
            filterMenuItem,
            ...this.getExtraPopupMenu('results.columnHeader', { transform: "tabulator" }),
          ]
        }

        const magic: any = MagicColumnBuilder.build(column.name) || {}
        const title = magic?.title ?? column.name ?? `Result ${index}`
        const editData: FieldEditData = this.editData?.get(column.id);

        let cssClass = 'hide-header-menu-icon';

        if (magic.cssClass) {
          cssClass += ` ${magic.cssClass}`;
        }

        if (editData?.isPK) {
          cssClass += ` primary-key`;
        }

        if (editData?.generated) {
          cssClass += ' generated-column';
        }

        if (this.editData && !editData?.editable && !editData?.isPK) {
          cssClass += ` read-only-field`;
        }

        if (magic.formatterParams?.fk) {
          magic.formatterParams.fkOnClick = (_e, cell) => this.fkClick(magic.formatterParams.fk[0], cell)
        }

        const magicStuff = _.pick(magic, ['formatter', 'formatterParams'])

        const editorType = this.editorType(editData?.dataType);
        const useVerticalNavigation = editorType === 'textarea'

        const formatterParams: FormatterParams = {
          fk: false,
          fkOnClick: undefined,
          isPK: editData?.isPK,
          binaryEncoding: this.$bksConfig.ui.general.binaryEncoding,
        }

        let headerTooltip = escapeHtml(column.name);

        if (editData) {
          headerTooltip = escapeHtml(`${editData?.generated ? '[Generated]' : ''}${editData?.columnName ?? column.name} ${editData?.dataType ?? ''}`);

          if (!editData.editable && !_.isNil(editData.readOnlyReason)) {
            headerTooltip += ` -> Read-Only: ${FieldReadOnlyReasonStr[editData.readOnlyReason]}`
          }
        }

        const result = {
          title,
          field: column.id,
          titleFormatter: this.headerFormatter,
          titleFormatterParams: {
            columnName: title,
            dataType: editData?.dataType,
            generated: editData?.generated
          },
          titleDownload: escapeHtml(column.name),
          dataType: editData?.dataType,
          width: columnWidth,
          mutator: this.resolveTabulatorMutator(column.dataType, dialectFor(this.connectionType)),
          maxInitialWidth: this.$bksConfig.ui.tableTable.maxColumnWidth,
          tooltip: this.cellTooltip,
          contextMenu: cellMenu,
          headerContextMenu: columnMenu,
          headerMenu: columnMenu,
          headerTooltip,
          resizable: 'header',
          cssClass,
          editable: this.cellEditCheck,
          editor: editorType,
          cellEditCancelled: (cell: CellComponent) => cell.getRow().normalizeHeight(),
          formatter: this.cellFormatter,
          formatterParams,
          editorParams: {
            verticalNavigation: useVerticalNavigation ? 'editor' : undefined,
            dataType: editData?.dataType,
            search: true,
            allowEmpty: true,
            preserveObject: editData?.array,
            onPreserveObjectFail: (value: unknown) => {
              log.error('Failed to preserve object for', value)
              return true
            },
            typeHint: editData?.dataType?.toLowerCase(),
            bksField: editData?.bksField,
            binaryEncoding: this.$bksConfig.ui.general.binaryEncoding,
          },
          ...magicStuff
        }

        if (column.dataType === 'INTERVAL') {
          // add interval sorter
          result['sorter'] = this.intervalSorter;
        } else if (editData?.dataType && /^(bool|boolean)$/i.test(editData?.dataType)) {
          const values = [
            { label: 'false', value: this.dialectData.boolean?.false ?? false },
            { label: 'true', value: this.dialectData.boolean?.true ?? true },
          ];
          if (editData?.nullable) values.push({ label: '(NULL)', value: null });
          result.editorParams['values'] = values;
        }

        const results = [];
        results.push(result)

        if (magic && magic.tableLink) {
          const fkCol = this.fkColumn(result, [magic.tableLink])
          results.push(fkCol)
        }
        return results;
      },
      headerFormatter(_cell, formatterParams) {
        const { columnName, dataType } = formatterParams
        const dataTypeStr = dataType ? `<span class="badge column-data-type">${escapeHtml(dataType)}</span>` : '';
        return `
          <span class="title">
            ${escapeHtml(columnName)}
            ${dataTypeStr}
          </span>
        `;
      },
      editorType(dataType: string) {
        const ne = vueEditor(NullableInputEditorVue)

        switch (dataType?.toLowerCase() ?? '') {
          case 'text':
          case 'json':
          case 'jsonb':
          case 'tsvector':
            return 'textarea'
          case 'bool':
          case 'boolean':
            return 'list'
          default: return ne
        }
      },
      cellEditCheck(cell: CellComponent): boolean {
        if (!this.editingData) return false

        const fieldEditData: FieldEditData = this.editData?.get(cell.getField());
        if (!fieldEditData) {
          return false;
        }

        return fieldEditData.editable;
      },
      cellEdited(cell: CellComponent) {
        const fieldEditData: FieldEditData = this.editData?.get(cell.getField());
        if (!fieldEditData) {
          log.warn('Could not find matching field for', cell.getField());
          return;
        }

        const pkFields: Map<string, FieldEditData> = new Map(
          this.editData
            .entries()
            .filter(([_id, editData]) => editData?.isPK &&
              editData?.linkedTable === fieldEditData?.linkedTable &&
              editData?.linkedSchema === fieldEditData?.linkedSchema)
        );
        const pkCells: CellComponent[] = cell.getRow().getCells().filter((c) => pkFields.has(c.getField()));

        if (cell.getOldValue() == cell.getValue()) {
          return;
        }

        if (!pkCells || !pkCells.length || pkFields.size !== pkCells.length) {
          this.$noty.error("Can't edit column -- couldn't figure out primary key");
          cell.restoreOldValue();
          return;
        }

        if (!this.fieldOriginalClassMap.has(cell.getField())) {
          // If we don't have the unmodified original class value, store it so we can reset classes later on :)
          this.fieldOriginalClassMap.set(cell.getField(), cell.getElement()?.classList.value);
        }

        // TODO (@day): if we're going to do inserts we'll have to check if edit is in a pending insert here

        const pkValues = pkCells.map((cell) => cell.getValue()).join('-');
        const key = `${pkValues}-${cell.getField()}`;

        const hasCurrent = _.some(this.pendingChanges.updates, { key: key });
        const existingEdited = this.maybeUpdateExistingEdit(key, cell);

        if (!existingEdited && !hasCurrent) {
          const pks = pkCells.map((cell) => ({ cell, data: pkFields.get(cell.getField())}));
          const cellData: CellData = {
            cell,
            data: fieldEditData
          };
          this.createNewEdit(key, cellData, pks);
        }

        this.propogateChanges(pkCells, cell, key, !existingEdited && hasCurrent);
      },
      maybeUpdateExistingEdit(key: string, cell: CellComponent): boolean {
        // This function returns whether or not an existing edit was edited in place
        const currentEdit = _.find(this.pendingChanges.updates, { key: key });

        if (!currentEdit) {
          return false
        }

        if (typeof currentEdit?.oldValue === 'undefined' && cell.getValue() == null) {
          // don't do anything because of an issue found when trying to set to null, undefined == null so was getting rid of the need to make a change\
          return true;
        } else if (currentEdit?.oldValue == cell.getValue()) {
          this.$set(this.pendingChanges, 'updates', _.without(this.pendingChanges.updates, currentEdit));
          return false; // no change made
        } else {
          currentEdit.value = cell.getValue();
          return true;
        }
      },
      createNewEdit(key: string, cellData: CellData, pks: CellData[]) {
        const { cell, data: fieldEditData } = cellData;

        const primaryKeys = pks.map(({ cell: pkCell, data }) => {
          return {
            column: data.columnName,
            // Use old value if this primary key cell is the one being edited, otherwise current value
            // This is for redis key renaming to work
            value: pkCell === cell ? pkCell.getOldValue() : pkCell.getValue()
          }
        });

        const payload: TableUpdatePayload = {
          key: key,
          field: cell.getField(),
          table: fieldEditData?.linkedTable,
          schema: fieldEditData?.linkedSchema,
          dataset: null,
          column: fieldEditData?.columnName,
          columnType: fieldEditData?.dataType,
          columnObject: undefined,
          primaryKeys,
          oldValue: cell.getOldValue(),
          value: cell.getValue(),
        };

        // remove existing pending updates with identical pKey-column combo
        let pendingUpdates = _.reject(this.pendingChanges.updates, { 'key': payload.key });
        pendingUpdates.push(payload);
        this.$set(this.pendingChanges, 'updates', pendingUpdates);
      },
      propogateChanges(pkCells: CellComponent[], cell: CellComponent, key: string, removeEdited: boolean = false) {
        this.tabulator.blockRedraw();

        if (!this.propogatedChangesFilters.has(key)) {
          const filters = pkCells.map((cell) => {
            return {
              field: cell.getField(),
              type: "=",
              value: cell.getValue()
            };
          });
          this.propogatedChangesFilters.set(key, filters);
        }

        const filters = this.propogatedChangesFilters.get(key);
        const rows: RowComponent[] = this.tabulator.searchRows(filters);
        rows.forEach((row) => {
          const data = row.getData();
          if (!data[this.internalClassTrackerColumn]) {
            data[this.internalClassTrackerColumn] = {
              edited: new Set<string>(),
              editError: new Set<string>(),
              editSuccess: new Set<string>()
            }
          }

          const tracker = data[this.internalClassTrackerColumn];
          const set = tracker.edited;
          if (removeEdited) {
            set.delete(cell.getField());
          } else {
            set.add(cell.getField())
          }

          row.update({
            [cell.getField()]: cell.getValue(),
            [this.internalClassTrackerColumn]: {
              ...tracker,
              edited: set
            }
          })

          row.reformat();
        })
        this.tabulator.restoreRedraw();
        this.$nextTick(() => {
          this.tabulator.redraw()
        })
      },
      buildPendingUpdates() {
        return this.pendingChanges.updates.map((update) => {
          return _.omit(update, ['key', 'oldValue', 'cell']);
        });
      },
      discardChanges() {
        this.saveError = null;

        this.pendingChanges.updates.forEach((edit: TableUpdatePayload) => this.discardUpdate(edit));

        this.resetPendingChanges();
      },
      discardUpdate(pendingUpdate: TableUpdatePayload) {
        const filters = this.propogatedChangesFilters.get(pendingUpdate.key);
        const rows: RowComponent[] = this.tabulator.searchRows(filters);
        rows?.forEach((row: RowComponent) => {
          this.discardCellUpdate(row, pendingUpdate.field, pendingUpdate.oldValue);
        })
      },
      discardCellUpdate(row: RowComponent, field: string, oldValue: any) {
        const tracker: ClassTracker = row?.getData()[this.internalClassTrackerColumn];
        tracker?.edited?.delete(field);
        tracker?.editError?.delete(field);

        row.update({
          [field]: oldValue,
          [this.internalClassTrackerColumn]: tracker
        });

        row.reformat();
      },
      focusOnFilterInput() {
        this.hiddenFilter = false
        this.$nextTick(() => {
          this.$refs.filterInput.focus()
        })
      },
      closeTableFilter() {
        this.hiddenFilter = true
        if (this.$refs.filterInput !== document.activeElement) return
        this.triggerFocus()
      },
      searchHandler() {
        this.tabulator.clearFilter()

        const columns = this.tableColumns
        const filters = columns.map(({field}) => ({
          type: 'like',
          value: this.filterValue.trim(),
          field
        }))

        this.tabulator.setFilter([filters])
      },
      clearSearchFilters() {
        this.filterValue = ''
        this.tabulator.clearFilter()
      },
      checkTableFocus() {
        const classes = [...document.activeElement.classList.values()];
        return classes.some(c => c.startsWith('tabulator'));
      },
      copySelection() {
        const isFocusingTable = this.checkTableFocus();
        if (!this.active || !isFocusingTable) return
        copyRanges({ ranges: this.tabulator.getRanges(), type: 'plain' })
      },
      dataToJson(rawData, firstObjectOnly) {
        const rows = _.isArray(rawData) ? rawData : [rawData]
        const result = rows.map((data) => {
          return this.$bks.cleanData(data, this.tableColumns)
        })
        return firstObjectOnly ? result[0] : result
      },
      rebuildColumns() {
        const el = this.$el.querySelector('.tabulator-tableholder');
        const scrollTop = el?.scrollTop;
        const scrollLeft = el?.scrollLeft;
        const newColumns = this.tableColumns;
        this.tabulator.setColumns(newColumns);

        this.$nextTick().then(() => {
          // just in case
          if (el) {
            el.scrollTop = scrollTop
            el.scrollLeft = scrollLeft
          }
        })
      },
      resetPendingChanges() {
        this.pendingChanges = {
          updates: [],
          deletes: []
        }
      },
      async copyToSql() {
        this.saveError = null;

        if (!this.editingData) return;

        try {
          const changes = {
            inserts: [],
            updates: this.buildPendingUpdates(),
            deletes: [],
          };

          const sql = await this.connection.applyChangesSql(changes);
          const formatted = format(sql, { language: FormatterDialect(this.queryDialect) })
          this.$root.$emit(AppEvent.newTab, formatted);
        } catch (ex) {
          log.error(ex)

          this.pendingChanges.updates.forEach((edit: TableUpdatePayload) => {
            const filters = this.propogatedChangesFilters.get(edit.key);
            const rows: RowComponent[] = this.tabulator.searchRows(filters);
            rows.forEach((row) => {
              const tracker: ClassTracker = row?.getData()[this.internalClassTrackerColumn];
              if (!tracker.editError) {
                tracker.editError = new Set<string>();
              }

              tracker.editError.add(edit.field);
              row.update({
                [this.internalClassTrackerColumn]: tracker
              });

              row.reformat();
            })
          });

          this.saveError = {
            titile: ex.message,
            message: ex.message,
            ex
          }

          this.$noty.error(ex.message)
          return
        }
      },
      async saveChanges() {
        this.saveError = null;

        if (!this.editingData) return;

        try {
          const payload = {
            inserts: [],
            updates: this.buildPendingUpdates(),
            deletes: [], // TODO (@day): deletes?
          };

          // @ts-ignore
          const result = await this.connection.applyChanges(payload, this.isManualCommit ? this.tab.id : null);

          if (this.hasPendingUpdates) {
            this.tabulator.clearCellEdited();
            //update data
            this.pendingChanges.updates.forEach(edit => {
              const filters = this.propogatedChangesFilters.get(edit.key);
              const rows: RowComponent[] = this.tabulator.searchRows(filters);
              rows.forEach((row) => {
                const tracker: ClassTracker = row?.getData()[this.internalClassTrackerColumn];

                tracker.editSuccess.add(edit.field);
                tracker.edited.delete(edit.field);
                row.update({
                  [this.internalClassTrackerColumn]: tracker
                });

                row.reformat();
              })

              setTimeout(() => {
                rows.forEach((row) => {
                  const tracker: ClassTracker = row?.getData()[this.internalClassTrackerColumn];

                  tracker.editSuccess.delete(edit.field);
                  row.update({
                    [this.internalClassTrackerColumn]: tracker
                  });

                  row.reformat();
                })
              }, 1000)
            })
          }

          this.resetPendingChanges();

        } catch (err) {
          this.pendingChanges.updates.forEach((edit: TableUpdatePayload) => {
            const filters = this.propogatedChangesFilters.get(edit.key);
            const rows: RowComponent[] = this.tabulator.searchRows(filters);
            rows.forEach((row) => {
              const tracker: ClassTracker = row?.getData()[this.internalClassTrackerColumn];

              tracker.editError.add(edit.field);
              row.update({
                [this.internalClassTrackerColumn]: tracker
              });

              row.reformat();
            })
          });

          this.saveError = {
            title: err.message,
            message: err.message,
            err
          };

          this.$noty.error(err.message);

          return;
        } finally {
          // forceRedraw??
        }
      },
      download(format) {
        let formatter = format;
        const dateString = dateFormat(new Date(), 'yyyy-mm-dd_hMMss');
        const title = this.query.title ? _.snakeCase(this.query.title) : 'query_results';

        if(format === 'md'){
          formatter = (rows, options, setFileContents) => {
            const values = rows.map(row => row.columns.map(col => typeof col.value === 'object' ? JSON.stringify(col.value) : col.value));
            setFileContents(markdownTable(values), 'text/markdown')
          };
        }

        // Fix Issue #1493 Lost column names in json query download
        // by overriding the tabulator-generated json with ...what cipboard() does, below:
        if(format === 'json'){
          formatter = (rows, options, setFileContents) => {
             const newValue = JSON.stringify(this.dataToJson(this.tabulator.getData(), false), null, "  ");
             setFileContents(newValue, 'text/json');
          };
        }

        // Fix Issue #2863 replacing null values with empty string
        if(format === 'xlsx'){
          formatter = (rows, options, setFileContents) => {
             const values = rows.map(row => row.columns.map(col => {
               if(col.value === null){
                 return '';
               }

               if(typeof col.value === 'object'){
                 return JSON.stringify(col.value);
               }

               return col.value;
              })
            );

             const ws = XLSX.utils.aoa_to_sheet(values);
             const wb = XLSX.utils.book_new();

             // sheet title cannot be more than 31 characters and sheet title cannot be 'history'
             // source: https://support.microsoft.com/en-us/office/rename-a-worksheet-3f1f7148-ee83-404d-8ef0-9ff99fbad1f9
             let sheetTitle = title.slice(0,31);
             if (title.toLowerCase() === "history") {
              sheetTitle = "history-sheet";
             }

             XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
             const excel = XLSX.write(wb, { type: 'buffer' });
             setFileContents(excel);
          }
        }

        this.tabulator.download(formatter, `${title}-${dateString}.${format}`, 'all');
      },
      clipboard(format = null) {
        // this.tabulator.copyToClipboard("all")

        const allRows = this.tabulator.getData()
        if (allRows.length == 0) {
          return
        }
        const columnTitles = {}

        const result = this.dataToJson(allRows, false)

        if (format === 'md') {
          const mdContent = [
            Object.keys(result[0]),
            ...result
                .map((row) =>
                  Object.values(row).map(v =>
                    (typeof v === 'object') ? JSON.stringify(v) : v
                  )
                )
          ];
          this.$native.clipboard.writeText(markdownTable(mdContent))
        } else if (format === 'json') {
          this.$native.clipboard.writeText(JSON.stringify(result))
        } else {
          this.$native.clipboard.writeText(
            Papa.unparse(
              result,
              { header: true, delimiter: "\t", quotes: true, escapeFormulae: true }
            )
          )
        }
      },
      // HACK (day): this is probably not the best way of doing things, but postgres intervals are dumb
      intervalSorter(a, b, aRow, bRow, column, dir, sorterParams) {
        try {
          const durationA = td.parse(intervalParse(a).toISOString());
          const durationB = td.parse(intervalParse(b).toISOString());
          const dateA = new Date(durationA.years, durationA.months, durationA.days, durationA.hours, durationA.minutes, durationA.seconds);
          const dateB = new Date(durationB.years, durationB.months, durationB.days, durationB.hours, durationB.minutes, durationB.seconds);
          return dateA - dateB;
        } catch {
          return 0;
        }
      },
      scrollToRangeIfOutOfView() {
        // FIXME This is a copy of how auto scroll works in tabulator
        // SelectRange. We need to make the API available from tabulator
        // instead of copying it here.
        // e.g. this.tabulator.scrollToRangeIfOutOfView
        const range = this.tabulator.getRanges().pop()
        const rangeBounds = range.getBounds()
        const row = rangeBounds.end.row
        const column = rangeBounds.end.column
        const rowRect = row.getElement().getBoundingClientRect();
        const columnRect = column.getElement().getBoundingClientRect();
        const rowManagerRect = this.tabulator.rowManager.getElement().getBoundingClientRect();
        const columnManagerRect = this.tabulator.columnManager.getElement().getBoundingClientRect();

        if(!(rowRect.top >= rowManagerRect.top && rowRect.bottom <= rowManagerRect.bottom)){
          if(row.getElement().parentNode && column.getElement().parentNode){
            // Use faster autoScroll when the elements are on the DOM
            this.tabulator.modules.selectRange.autoScroll(range, row.getElement(), column.getElement());
          }else{
            row.getComponent().scrollTo(undefined, false);
          }
        }

        if(!(columnRect.left >= columnManagerRect.left + this.rowHeaderWidth && columnRect.right <= columnManagerRect.right)){
          if(row.getElement().parentNode && column.getElement().parentNode){
            // Use faster autoScroll when the elements are on the DOM
            this.tabulator.modules.selectRange.autoScroll(range, row.getElement(), column.getElement());
          }else{
            column.getComponent().scrollTo(undefined, false);
          }
        }
      },
      triggerFocus() {
        this.tabulator.rowManager.getElement().focus();
      },
      updateJsonViewerSidebar() {
        /** @type {import('@/lib/data/jsonViewer').UpdateOptions} */
        const data = {
          dataId: this.selectedRowId,
          value: this.selectedRowData,
          expandablePaths: [],
          editablePaths: [],
          signs: {},
        }
        this.trigger(AppEvent.updateJsonViewerSidebar, data)
      },
      handleRangeChange(ranges) {
        const row = ranges[0].getRows()[0];
        const parsedData = parseRowDataForJsonViewer(row.getData(), this.tableColumns)
        this.selectedRowData = this.dataToJson(parsedData, true)
        this.selectedRowPosition = row.getPosition()
        this.updateJsonViewerSidebar()
      },
      handleTabActive() {
        this.updateJsonViewerSidebar()
      },
      handleSwitchedTab(tab) {
        if (tab.id === this.tab.id) {
          this.handleTabActive()
        }
      },
    },
    beforeDestroy() {
      if (this.tabulator) {
        this.tabulator.destroy()
      }
      this.unregisterHandlers(this.rootBindings)
    },
    async mounted() {
      this.initializeTabulator()
      if (this.focus) {
        const onTableBuilt = () => {
          this.triggerFocus()
          this.tabulator.off('tableBuilt', onTableBuilt)
        }
        this.tabulator.on('tableBuilt', onTableBuilt)
      }
      if (this.active) {
        this.handleTabActive()
      }
      this.registerHandlers(this.rootBindings)
    },
	}
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/mixins';

  .result-table {
    position: relative;

    &.hidden-filter .table-search-wrapper {
      display: none;
    }

    &::v-deep:not(.hidden-filter) {
      .tabulator-tableholder {
        padding-bottom: 5rem;
      }
    }
  }

  .table-search-wrapper.table-filter {
    display: flex;
    padding: 0.8rem 1rem;
    justify-content: space-between;
    width: auto;
    position: absolute;
    bottom: 1rem;
    right: 1.5rem;
    z-index: 10;
    align-items: center;
    background-color: var(--query-editor-bg);
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    @include card-shadow;

    .btn-fab {
      min-width: auto;
      width: 1.6rem;
      height: 1.5rem;
      margin-left: 0.4rem;

      &[type=submit] {
        margin-left: 0.75rem;
      }

      .material-icons {
        font-size: 1.2rem;
      }
    }
  }

  .input-wrapper {
    width: 17rem;
    position: relative;
    .clear {
      visibility: hidden;
      position: absolute;
      right: 0;
      top: 5px;
    }
    &:hover .clear {
      visibility: visible;
    }
  }
</style>
