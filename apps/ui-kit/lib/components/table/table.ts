import { PropType } from "vue";
import { Column, OrderBy } from "./types";
//  FIXME cant import Dialect type here
// import { Dialect } from "@shared/lib/dialects/models";
type Dialect = unknown;
import { BaseData } from "../types";
import { TupleUnion } from "../utilTypes";
import { CustomMenuItems } from "../context-menu/menu";
import { Options as TabulatorOptions } from "tabulator-tables";
import { Tabulator } from "..";

export const props = {
  /** The name of the table. */
  name: {
    type: String,
    default: "table",
  },
  /** The id for the table component. If provided, the columns' width and visibility
    will be persisted based on this id. */
  tableId: String,
  /** The schema of the table. */
  schema: String,
  /** The data to render. Represented as a list of objects where the keys are the
    column names. */
  data: {
    type: Array as PropType<BaseData>,
    default: () => [],
  },
  /** The columns to render. */
  columns: {
    type: Array as PropType<Column[]>,
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
  binaryEncoding: {
    type: String as PropType<"hex" | "base64">,
    default: "hex",
  },
  cellContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
  columnHeaderContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
  rowHeaderContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
  cornerHeaderContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,

  /** Customize the tabulator's table options. See https://tabulator.info/docs/6.3/options#table */
  tabulatorOptions: {
    type: Object as PropType<Partial<TabulatorOptions>>,
    default: () => ({}),
  },
};

export interface ExposedMethods {
  getTabulator(): Tabulator | null;
}

export const exposeMethods: TupleUnion<keyof ExposedMethods> = [
  "getTabulator",
];
