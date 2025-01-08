<template>
  <div ref="table" />
</template>

<script lang="ts">
import "./Table.scss";
import Vue, { PropType } from "vue";
import _ from "lodash";
import { tabulatorForTableData, Options } from "./tabulator";
import { escapeHtml } from "./mixins/tabulator";
import {
  Options as TabulatorOptions,
  ColumnDefinition,
  TabulatorFull,
  RangeComponent,
} from "tabulator-tables";
import {
  copyRanges,
  copyActionsMenu,
  commonColumnMenu,
  resizeAllColumnsToFitContent,
  resizeAllColumnsToFixedWidth,
} from "./menu";
import { openMenu, divider, useCustomMenuItems } from "../context-menu/menu";
import * as td from "tinyduration";
import intervalParse from "postgres-interval";
import Mutators from "./mixins/data_mutators";
//  FIXME cant import Dialect type here
// import { Dialect } from "@shared/lib/dialects/models";
import * as constants from "../../utils/constants";
import { Column, OrderBy } from "./types";

export default Vue.extend({
  mixins: [Mutators],
  props: {
    /** The name of the table. */
    table: {
      type: String,
      required: true,
    },
    /** The id for the table component. If provided, the columns' width and visibility
    will be persisted based on this id. */
    tableId: String,
    /** The schema of the table. */
    schema: String,
    /** The data to render. Represented as a list of objects where the keys are the
    column names. */
    data: {
      type: Array as PropType<Array<Record<string, any>>>,
      default: () => [],
    },
    /** The columns to render. */
    columns: {
      type: Array as PropType<Array<Column>>,
      default: () => [],
    },
    /** Whether the table should be focused. */
    hasFocus: Boolean,
    preventRedraw: {
      type: Boolean,
      default: false,
    },
    /** If this is changed, the table will be redrawn. */
    redrawState: null,
    /** If this is changed, the table will be reinitialized. */
    reinitializeState: null,
    /** Configure the height of the table. */
    height: String,
    /** The database dialect. */
    dialect: String as PropType<Dialect>,
    /** The offset for the row headers. Determines the starting number displayed
    on the left side of rows.  */
    rowHeaderOffset: {
      type: Number,
      default: 0,
    },
    /** Apply sort orders to the table */
    sorters: {
      type: Array as PropType<Array<OrderBy>>,
      default: () => [],
    },
    cellContextMenuItems: [Array, Function],
    columnHeaderContextMenuItems: [Array, Function],
    rowHeaderContextMenuItems: [Array, Function],
    cornerHeaderContextMenuItems: [Array, Function],

    /** Customize the tabulator's table options. See https://tabulator.info/docs/6.3/options#table */
    tabulatorOptions: {
      type: Object as PropType<Partial<TabulatorOptions>>,
      default: () => ({}),
    },
  },
  data() {
    return {
      isBuilt: false,
      pendingTasks: [],
      rangesInfo: [],
      columnWidths: null,
      preLoadScrollPosition: null,
    };
  },
  computed: {
    tableColumns() {
      const columnWidth =
        this.columns.length > 30 ? constants.bigTableColumnWidth : undefined;

      const cellMenu = (event, cell) => {
        const defaultItems = copyActionsMenu({
          ranges: cell.getRanges(),
          table: this.table,
          schema: this.defaultSchema,
        })
        const items = useCustomMenuItems(event, defaultItems, this.cellContextMenuItems)
        openMenu({ options: items, item: cell, event })
        return false
      };

      const columnMenu = (event, column) => {
        const defaultItems = [
          ...copyActionsMenu({
            ranges: column.getRanges(),
            table: this.table,
            schema: this.defaultSchema,
          }),
          divider,
          ...commonColumnMenu,
        ]
        const items = useCustomMenuItems(event, defaultItems, this.columnHeaderContextMenuItems)
        openMenu({ options: items, item: column, event })
        return false;
      };

      const columns = this.columns.flatMap((column: Column) => {
        const results = [];
        const title = column.title ?? column.field;
        let headerTooltip = escapeHtml(`${column.field} ${column.dataType}`)
        let cssClass = 'hide-header-menu-icon';

        if (column.generated) {
          headerTooltip = '[Generated] ' + headerTooltip
          cssClass += " generated-column";
        }
        if (column.foreignKey) {
          cssClass += " foreign-key";
        } else if (column.primaryKey) {
          headerTooltip += ' [Primary Key]'
          cssClass += " primary-key";
        }
        if (column.cssClass) {
          cssClass += ` ${column.cssClass}`
        }

        // FIXME missing tooltips for foreign keys
        // if (hasKeyDatas) {
        //   const keyData = keyDatas[0][1];
        //   if (keyData.length === 1)
        //     headerTooltip += escapeHtml(` -> ${keyData[0].toTable}(${keyData[0].toColumn})`)
        //   else
        //     headerTooltip += escapeHtml(` -> ${keyData.map(item => `${item.toTable}(${item.toColumn})`).join(', ').replace(/, (?![\s\S]*, )/, ', or ')}`)

        const result: ColumnDefinition = {
          title,
          titleFormatter() {
            return `<span class="title">${escapeHtml(title)}</span>`;
          },
          field: column.field,
          editable: !!column.editable,
          editor: 'input',
          titleDownload: escapeHtml(column.title),
          titleClipboard: escapeHtml(column.title),
          titlePrint: escapeHtml(column.title),
          titleHtmlOutput: escapeHtml(column.title),
          dataType: column.dataType,
          width: columnWidth,
          mutatorData: this.resolveTabulatorMutator(column.dataType, this.dialect),
          mutator: this.resolveTabulatorMutator(column.dataType, this.dialect),
          formatter: this.cellFormatter,
          formatterParams: {
            fk: column.foreignKey,
            fkOnClick: (value, field) => {
              this.$emit("bks-foreign-key-go-to", { value, field });
            },
            isPK: column.primaryKey,
          },
          minWidth: constants.minColumnWidth,
          maxWidth: constants.maxColumnWidth,
          maxInitialWidth: constants.maxInitialColumnWidth,

          // FIXME tooltip won't work in shadow dom
          tooltip: this.cellTooltip,
          headerTooltip,

          // FIXME context won't work in shadow dom
          contextMenu: cellMenu,
          headerContextMenu: columnMenu,
          headerMenu: columnMenu,
          resizable: "header",
          cssClass,
          sorter: column.sorter === 'none' ? () => 0 : column.sorter,
        };

        if (column.dataType === "INTERVAL") {
          // add interval sorter
          result["sorter"] = this.intervalSorter;
        }

        const customDef =
          typeof column.tabulatorColumnDefintion === "function"
            ? column.tabulatorColumnDefinition(result)
            : column.tabulatorColumnDefinition;

        results.push({ ...result, ...customDef });

        return results;
      });

      return columns;
    },
  },
  watch: {
    tableColumns() {
      this.setColumns(this.tableColumns);
    },
    data() {
      this.setData(this.data);
    },
    hasFocus() {
      if (this.hasFocus) {
        this.triggerFocus();
      }
    },
    preventRedraw() {
      if (this.preventRedraw) {
        this.blockRedraw();
      } else {
        this.restoreRedraw();
      }
    },
    redrawState() {
      this.redraw();
    },
    reinitializeState() {
      this.initialize();
    },
    height() {
      this.setHeight(this.height);
    },
  },
  methods: {
    setData(data: any) {
      if (!this.isBuilt) return

      this.preLoadScrollPosition = this.$el.querySelector('.tabulator-tableholder').scrollLeft
      this.tabulator.setData(data);
    },
    async setColumns(columns: ColumnDefinition[]) {
      if (!this.isBuilt) return

      if (columns.length === 0) {
        await this.initialize();
      } else {
        this.tabulator.options.autoColumns = false;
        this.tabulator.setColumns(columns);
      }
      this.columnWidths = this.tabulator.getColumns().map((c) => {
        return { field: c.getField(), width: c.getWidth()}
      })
    },
    blockRedraw() {
      this.tabulator?.blockRedraw();
    },
    restoreRedraw() {
      this.tabulator?.restoreRedraw();
    },
    redraw() {
      this.tabulator.redraw();
    },
    focus() {
      this.tabulator?.rowManager.getElement().focus();
      this.scrollToRangeIfOutOfView();
    },
    setHeight(height: string) {
      this.tabulator.setHeight(height);
    },
    copySelection() {
      copyRanges({ ranges: this.tabulator.getRanges(), type: "plain" });
    },
    async initialize() {
      this.isBuilt = false
      await this.$nextTick();
      if (this.tabulator) {
        this.tabulator.destroy();
        this.tabulator = null;
      }
      const options: Options = {
        rowHeaderOffset: this.rowHeaderOffsetGetter,
        rowHeaderContextMenu: (event, cell) => {
          const defaultItems = copyActionsMenu({
            ranges: cell.getRanges(),
            table: this.table,
            schema: this.schema,
          })
          const items = useCustomMenuItems(event, defaultItems, this.rowHeaderContextMenuItems)
          openMenu({ options: items, item: cell, event })
          return false;
        },
        cornerHeaderContextMenu: (event, column) => {
          const defaultItems = [
            ...copyActionsMenu({
              ranges: column.getTable().getRanges(),
              table: this.table,
              schema: this.schema,
            }),
            divider,
            resizeAllColumnsToFitContent,
            resizeAllColumnsToFixedWidth,
          ]
          const items = useCustomMenuItems(event, defaultItems, this.cornerHeaderContextMenuItems)
          openMenu({ options: items, item: column, event })
          return false
        },
      }
      const defaultOptions: TabulatorOptions = {
        persistenceID: this.tableId,
        data: this.data,
        height: this.height,
      };
      if (this.tableColumns.length === 0) {
        defaultOptions.autoColumns = true;
      } else {
        defaultOptions.columns = this.tableColumns;
      }
      const tabulatorOptions: TabulatorOptions = _.merge(
        defaultOptions,
        this.tabulatorOptions
      );
      this.tabulator = tabulatorForTableData(
        this.$refs.table,
        options,
        tabulatorOptions
      );
      this.$refs.table.addEventListener("keydown", this.keydown);
      this.tabulator.on("tableBuilt", () => {
        this.isBuilt = true
        this.pendingTasks.forEach((task) => task())
        this.$emit("bks-tabulator-built", this.tabulator);
      });
      this.tabulator.on("sortChanged", (sorters) => {
        this.$emit("bks-sorters-change", sorters.map(({ field, dir }) => ({ field, dir })));
      });
      this.tabulator.on("cellMouseUp", this.checkRangeChanges);
      this.tabulator.on("headerMouseUp", this.checkRangeChanges);
      this.tabulator.on("keyNavigate", this.checkRangeChanges);
      // Tabulator range is reset after data is processed
      this.tabulator.on("dataProcessed", this.checkRangeChanges);
      this.tabulator.on('dataProcessed', this.maybeScrollAndSetWidths);
    },
    maybeScrollAndSetWidths() {
      if (this.columnWidths) {
        try {
          this.tabulator.blockRedraw()
          this.columnWidths.forEach(({ field, width}) => {
            const col = this.tabulator.getColumn(field)
            if (col) col.setWidth(width)
          })
          this.columnWidths = null
        } catch (ex) {
          console.error("error setting widths", ex)
        } finally {
          this.tabulator.restoreRedraw()
        }
      }
      if (this.preLoadScrollPosition) {
        this.$el.querySelector('.tabulator-tableholder').scrollLeft = this.preLoadScrollPosition
        this.preLoadScrollPosition = null
      }
    },
    checkRangeChanges() {
      const ranges = this.tabulator.getRanges()
      function edgesOfRange(range: RangeComponent) {
        return {
          top: range.getTopEdge(),
          bottom: range.getBottomEdge(),
          left: range.getLeftEdge(),
          right: range.getRightEdge(),
        }
      }
      if (this.rangesInfo.length !== ranges.length) {
        this.rangesInfo = ranges.map(edgesOfRange)
        this.$emit("bks-ranges-change", ranges)
        return
      }
      const foundDiffRange = ranges.some((range, idx) => {
        const oldEdges = this.rangesInfo[idx]
        const updatedEdges = edgesOfRange(range)
        return !_.isEqual(updatedEdges, oldEdges)
      })
      if (foundDiffRange) {
        this.rangesInfo = ranges.map(edgesOfRange)
        this.$emit("bks-ranges-change", ranges)
        return
      }
    },
    keydown(event: KeyboardEvent) {
      const isCtrl = event.ctrlKey || event.metaKey;
      if (isCtrl && event.key === 'c') {
        event.preventDefault();
        event.stopPropagation();

        this.copySelection();
        return
      }
    },
    scrollToRangeIfOutOfView() {
      // FIXME(azmi): This is a copy of how auto scroll works in tabulator
      // SelectRange. We need to make the API available from tabulator
      // instead of copying it here.
      // e.g. this.tabulator.scrollToRangeIfOutOfView
      const range = this.tabulator.getRanges().pop();
      const rangeBounds = range.getBounds();
      const row = rangeBounds.end.row;
      const column = rangeBounds.end.column;
      const rowRect = row.getElement().getBoundingClientRect();
      const columnRect = column.getElement().getBoundingClientRect();
      const rowManagerRect = this.tabulator.rowManager
        .getElement()
        .getBoundingClientRect();
      const columnManagerRect = this.tabulator.columnManager
        .getElement()
        .getBoundingClientRect();

      if (
        !(
          rowRect.top >= rowManagerRect.top &&
          rowRect.bottom <= rowManagerRect.bottom
        )
      ) {
        if (row.getElement().parentNode && column.getElement().parentNode) {
          // Use faster autoScroll when the elements are on the DOM
          this.tabulator.modules.selectRange.autoScroll(
            range,
            row.getElement(),
            column.getElement()
          );
        } else {
          row.getComponent().scrollTo(undefined, false);
        }
      }

      if (
        !(
          columnRect.left >= columnManagerRect.left + this.rowHeaderWidth &&
          columnRect.right <= columnManagerRect.right
        )
      ) {
        if (row.getElement().parentNode && column.getElement().parentNode) {
          // Use faster autoScroll when the elements are on the DOM
          this.tabulator.modules.selectRange.autoScroll(
            range,
            row.getElement(),
            column.getElement()
          );
        } else {
          column.getComponent().scrollTo(undefined, false);
        }
      }
    },
    // HACK (day): this is probably not the best way of doing things, but postgres intervals are dumb
    intervalSorter(a, b, aRow, bRow, column, dir, sorterParams) {
      try {
        const durationA = td.parse(intervalParse(a).toISOString());
        const durationB = td.parse(intervalParse(b).toISOString());
        const dateA = new Date(
          durationA.years,
          durationA.months,
          durationA.days,
          durationA.hours,
          durationA.minutes,
          durationA.seconds
        );
        const dateB = new Date(
          durationB.years,
          durationB.months,
          durationB.days,
          durationB.hours,
          durationB.minutes,
          durationB.seconds
        );
        return dateA - dateB;
      } catch {
        return 0;
      }
    },
    rowHeaderOffsetGetter() {
      return this.rowHeaderOffset;
    },
  },
  created() {
    // Storing `tabulator` as `data` wouldn't allow Vue clients to store it and
    // its descendants as `data` too. It freezes the component >:D. Best to do
    // this if we intend to send the data to the client.
    this.tabulator = null as TabulatorFull | null;
  },
  mounted() {
    this.initialize();
    if (this.hasFocus) {
      const onTableBuilt = () => {
        this.focus();
        this.tabulator.off("tableBuilt", onTableBuilt);
      };
      this.tabulator.on("tableBuilt", onTableBuilt);
    }
  },
  beforeDestroy() {
    this.tabulator?.destroy();
  },
});
</script>
