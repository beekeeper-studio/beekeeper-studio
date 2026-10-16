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
 * - `selection`: the user selected more than one cell. `activeRange` holds it.
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

/** The latest range, when it covers more than the one cell under the cursor. */
export function selectedRange(tabulator: Tabulator): RangeComponent | null {
  const range = _.last(tabulator.getRanges?.() ?? []);
  return range && rangeCellCount(range) > 1 ? range : null;
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
