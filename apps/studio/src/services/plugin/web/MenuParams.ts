// The params a plugin view gets when it is opened from a menu placement.
import type {
  CellComponent,
  ColumnComponent,
  RangeComponent,
  RowComponent,
  Tabulator,
} from "tabulator-tables";
import type {
  ActiveRange,
  CellMenuParams,
  CellMenuTarget,
  ColumnMenuParams,
  ColumnMenuTarget,
  CornerMenuParams,
  CornerMenuTarget,
  EditorMenuParams,
  RowMenuParams,
  RowMenuTarget,
  StatusbarMenuParams,
  TableFilter as PluginTableFilter,
} from "@beekeeperstudio/plugin";
import type { TableFilter } from "@/lib/db/models";
import { dataColumns, selectedRange } from "@/common/tabulator";

type BigIntSerialized = number;

export function buildParamsForTableMenu(
  component: CellComponent,
  componentType: "cell" | "corner"
): CellMenuParams | CornerMenuParams;
export function buildParamsForTableMenu(
  component: ColumnComponent,
  componentType: "column"
): ColumnMenuParams;
export function buildParamsForTableMenu(
  component: RowComponent,
  componentType: "row"
): ColumnMenuParams;
export function buildParamsForTableMenu(
  component: CellComponent | ColumnComponent | RowComponent,
  componentType: "cell" | "corner" | "column" | "row"
): CellMenuParams | ColumnMenuParams | RowMenuParams | CornerMenuParams {
  const ranges = component.getTable().getRanges();
  let range: RangeComponent;

  if (ranges.length === 0) {
    throw new Error(
      "Range not found. This should never happen. Please report this as a bug."
    );
  }

  if (ranges.length === 1 || componentType === "corner") {
    range = ranges[0];
  } else {
    range =
      ranges.find((range) => {
        if (componentType === "cell") {
          return range._range
            .getCells()
            .find((cell) => cell === component._cell);
        }
        if (componentType === "row") {
          return range._range.getRows().find((row) => row === component._row);
        }
        if (componentType === "column") {
          return range._range
            .getColumns()
            .find((column) => column === component._column);
        }
        return undefined;
      }) || ranges[0];
  }

  const activeRange: ActiveRange = {
    rows: range.getRows().map((row) => row.getPosition() || 1),
    columns: range.getColumns().map((col) => col.getDefinition().title),
    value: range.getStructuredCells().map((row) => {
      return serializeArray(row.map((cell) => cell.getValue()));
    }),
  };

  if (componentType === "cell") {
    const cell = component as CellComponent;
    const target: CellMenuTarget = {
      type: "cell",
      row: cell.getRow().getPosition() || 1,
      column: cell.getColumn().getDefinition().title,
      value: serializeBigInt(cell.getValue()),
    };
    return { target, activeRange };
  }

  if (componentType === "column") {
    const column = component as ColumnComponent;
    const target: ColumnMenuTarget = {
      type: "column",
      rows: range.getRows().map((row) => row.getPosition() || 1),
      column: column.getDefinition().title,
      value: range.getStructuredCells().map((row) => {
        return serializeArray(row.map((cell) => cell.getValue()));
      }),
    };
    return { target, activeRange };
  }

  if (componentType === "row") {
    const row = component as RowComponent;
    const target: RowMenuTarget = {
      type: "row",
      row: row.getPosition() || 1,
      columns: row
        .getCells()
        .map((cell) => cell.getColumn().getDefinition().title),
      value: row.getCells().map((cell) => serializeBigInt(cell.getValue())),
    };
    return { target, activeRange };
  }

  if (componentType === "corner") {
    const target: CornerMenuTarget = {
      type: "corner",
      rows: activeRange.rows,
      columns: activeRange.columns,
      value: activeRange.value,
    };
    return { target, activeRange };
  }

  throw new Error(
    `Unknown component type: ${componentType}. This should never happen. Please report this as a bug.`
  );
}

function serializeBigInt(val: bigint): BigIntSerialized;
function serializeBigInt<T>(val: T): T;
function serializeBigInt(val: unknown): unknown {
  if (typeof val === "bigint") {
    return Number(val);
  }
  return val;
}

function serializeArray<T>(
  arr: T[]
): (T extends bigint ? BigIntSerialized : T)[];
function serializeArray(arr: unknown[]): unknown[] {
  return arr.map((item) => serializeBigInt(item));
}

/** The query editor passes its text in the handler payload. */
export function editorParams(
  payload: { text?: string; selectedText?: string; selectedQuery?: string } = {}
): EditorMenuParams {
  return {
    text: payload.text ?? "",
    selectedText: payload.selectedText ?? "",
    selectedQuery: payload.selectedQuery ?? "",
  };
}

/** What a status bar Visualize button passes its plugin items' handlers. */
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

/** Rows of `rows` and data columns of `columns`, leaving out internal columns
 * such as the row header and foreign key links. */
function toActiveRange(
  rows: RowComponent[],
  columns: ColumnComponent[]
): ActiveRange {
  const data = dataColumns(columns);
  return {
    rows: rows.map((row, index) => row.getPosition() || index + 1),
    columns: data.map((column) => column.getDefinition().title),
    value: rows.map((row) => {
      const values = row.getData();
      return serializeArray(data.map((column) => values[column.getField()]));
    }) as ActiveRange["value"],
  };
}

export function buildParamsForStatusbar(payload: StatusbarMenuPayload): StatusbarMenuParams {
  const context: Partial<StatusbarMenuParams> = payload.table
    ? {
        entity: {
          type: payload.table.entityType ?? "table",
          schema: payload.table.schema,
          name: payload.table.name,
        },
        // The app's filter types are a superset of the SDK's (e.g. `not in`)
        filters: (payload.filters ?? []) as PluginTableFilter[],
        where: payload.where ?? "",
      }
    : {
        query: payload.query ?? "",
        truncated: !!payload.truncated,
      };

  const range = selectedRange(payload.tabulator);
  if (range) {
    const activeRange = toActiveRange(range.getRows(), range.getColumns());
    return { source: "selection", target: { type: "corner", ...activeRange }, activeRange, ...context };
  }

  if (payload.table) {
    return { source: "table", ...context };
  }

  const tabulator = payload.tabulator;
  const visible = tabulator.getColumns().filter((column) => column.isVisible());
  const activeRange = toActiveRange(tabulator.getRows("active"), visible);
  return { source: "result", target: { type: "corner", ...activeRange }, activeRange, ...context };
}
