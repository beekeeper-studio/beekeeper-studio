// FIXME not any
export type TableOrView = any
export type Routine = any
export type Entity = TableOrView | Routine | string;

export interface EntityFilter {
  filterQuery?: string;
  showTables: boolean;
  showViews: boolean;
  showRoutines: boolean;
  showPartitions: boolean;
}

export const RoutineTypeNames = {
  function: "Function",
  window: "Window Function",
  aggregate: "Aggregate Function",
  procedure: "Stored Procedure",
};

export interface Table {
  name: string;
  schema?: string;
  columns?: {
    name: string;
    dataType: string;
  }[]
}

export type Item = SchemaItem | TableItem | RoutineItem;

export interface BaseItem {
  type: "schema" | "table" | "routine" | "root";
  entity: Entity;
  key: string;
  expanded: boolean;
  hidden: boolean;
  contextMenu: any[];
  level: number;
  parent?: BaseItem;
  pinned: boolean;
}

export interface RootItem extends BaseItem {
  type: "root";
  entity: string;
}

export interface SchemaItem extends BaseItem {
  type: "schema";
  entity: string;
  parent: BaseItem;
}

export interface TableItem extends BaseItem {
  type: "table";
  entity: TableOrView;
  parent: BaseItem;
  loadingColumns: boolean;
}

export interface RoutineItem extends BaseItem {
  type: "routine";
  entity: Routine;
  parent: BaseItem;
}
