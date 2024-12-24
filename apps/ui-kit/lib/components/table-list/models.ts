// FIXME not any
type TableOrView = any
type Routine = any
type Entity = TableOrView | Routine | string;

export interface ExpandEventData {
  entity: Entity;
  expanded: boolean;
}

export interface DblClickEventData {
  entity: Entity;
}

export interface ContextMenuEventData {
  entity: Entity;
}

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
