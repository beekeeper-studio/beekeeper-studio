import type { RangeComponent, Tabulator } from "tabulator-tables";
import type { TableFilter } from "@/lib/db/models";
import type { ActiveRange } from "@beekeeperstudio/plugin";
import { isBksInternalColumn } from "@/common/utils";
import _ from "lodash";

/** What a status bar Visualize button hands its plugin items. */
export type StatusbarMenuPayload = {
  tabulator: Tabulator;
  /** The statement that produced the result. Query results only. */
  query?: string;
  /** The result stopped at the row limit. Query results only. */
  truncated?: boolean;
  /** The table being viewed. Table view only. */
  table?: { name: string; schema?: string; entityType?: string };
  /** Filters applied in the table view. */
  filters?: TableFilter[];
  /** The SQL `WHERE` condition for those filters, without the keyword. */
  where?: string;
};

/**
 * Params for `results.statusbar` and `tableTable.statusbar`.
 *
 * - `selection`: the user selected more than one cell, or a row or column
 *   from its header. `activeRange` holds it.
 * - `result`: every row of a query result. `activeRange` holds it.
 * - `table`: a table view with nothing selected. The grid only holds one
 *   page, so no rows are sent: the plugin reads the table itself, with its
 *   own row limit, using `entity` and `where`.
 */
export type StatusbarMenuParams = {
  source: "selection" | "result" | "table";
  target?: { type: "corner" } & ActiveRange;
  activeRange?: ActiveRange;
  query?: string;
  truncated?: boolean;
  entity?: { type: string; schema?: string; name: string };
  filters?: TableFilter[];
  where?: string;
};

function serialize(value: unknown) {
  return typeof value === "bigint" ? Number(value) : value;
}

function dataColumns(columns: ReturnType<RangeComponent["getColumns"]>) {
  return columns.filter((column) => !isBksInternalColumn(column.getField() ?? ""));
}

export function rangeCellCount(range: RangeComponent): number {
  return range.getRows().length * dataColumns(range.getColumns()).length;
}

/**
 * Report the size of the selection, or 0 without one, whenever a range is
 * added, resized or removed, by mouse or keyboard. Debounced: dragging fires
 * on every cell.
 */
export function onSelectedCellsChange(tabulator: Tabulator, callback: (cells: number) => void) {
  const report = _.debounce(() => {
    let cells = 0;
    try {
      const range = selectedRange(tabulator);
      cells = range ? rangeCellCount(range) : 0;
    } catch {
      // The table was destroyed (e.g. replaced by a new result) before this ran
      return;
    }
    callback(cells);
  }, 50);
  for (const event of ["rangeAdded", "rangeChanged", "rangeRemoved", "dataProcessed"] as const) {
    tabulator.on(event, report);
  }
}

/** Tabulator's range modes after a click on a row header, column header or the corner. */
const HEADER_SELECTING = ["row", "column", "all"];

/**
 * The latest range, when the user selected it: more than the one cell under
 * the cursor, or a row or column picked from its header, which is a single
 * cell in a one-column or one-row result.
 */
export function selectedRange(tabulator: Tabulator): RangeComponent | null {
  const range = _.last(tabulator.getRanges?.() ?? []);
  if (!range) return null;
  // Not public API: the range module keeps the mode of the latest selection
  const selecting = (tabulator as any).modules?.selectRange?.selecting;
  return rangeCellCount(range) > 1 || HEADER_SELECTING.includes(selecting) ? range : null;
}

function rangeToActiveRange(range: RangeComponent): ActiveRange {
  const columns = dataColumns(range.getColumns());
  const rows = range.getRows();
  return {
    rows: rows.map((row, index) => row.getPosition() || index + 1),
    columns: columns.map((column) => column.getDefinition().title),
    value: rows.map((row) => {
      const data = row.getData();
      return columns.map((column) => serialize(data[column.getField()]));
    }) as ActiveRange["value"],
  };
}

function wholeTableActiveRange(tabulator: Tabulator): ActiveRange {
  const columns = dataColumns(tabulator.getColumns()).filter((column) => column.isVisible());
  const rows = tabulator.getRows("active");
  return {
    rows: rows.map((row, index) => row.getPosition() || index + 1),
    columns: columns.map((column) => column.getDefinition().title),
    value: rows.map((row) => {
      const data = row.getData();
      return columns.map((column) => serialize(data[column.getField()]));
    }) as ActiveRange["value"],
  };
}

export function buildParamsForStatusbar({ item }: { item: StatusbarMenuPayload }): StatusbarMenuParams {
  const context: Partial<StatusbarMenuParams> = item.table
    ? {
        entity: {
          type: item.table.entityType ?? "table",
          schema: item.table.schema,
          name: item.table.name,
        },
        filters: item.filters ?? [],
        where: item.where ?? "",
      }
    : {
        query: item.query ?? "",
        truncated: !!item.truncated,
      };

  const range = selectedRange(item.tabulator);
  if (range) {
    const activeRange = rangeToActiveRange(range);
    return { source: "selection", target: { type: "corner", ...activeRange }, activeRange, ...context };
  }

  if (item.table) {
    return { source: "table", ...context };
  }

  const activeRange = wholeTableActiveRange(item.tabulator);
  return { source: "result", target: { type: "corner", ...activeRange }, activeRange, ...context };
}
