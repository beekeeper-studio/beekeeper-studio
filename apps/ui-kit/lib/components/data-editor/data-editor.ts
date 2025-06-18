import { PropType } from "vue";
import { Table } from "./types";

export const props = {
  /** List of entities (tables) available for selection */
  entities: {
    type: Array as PropType<Table[]>,
    default: () => [{ columns: [], data: [] }],
  },
  /** Props passed to the EntityList component */
  entityListProps: {
    type: Object,
    default: () => ({}),
  },
  /** Props passed to the SqlTextEditor component */
  sqlTextEditorProps: {
    type: Object,
    default: () => ({}),
  },
  /** Props passed to the Table component */
  tableProps: {
    type: Object,
    default: () => ({}),
  },
};

export interface ExposedMethods {
  setTable(table: Table): void;
}

export const exposeMethods = ["setTable"] as const;