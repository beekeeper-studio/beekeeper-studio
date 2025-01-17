import { BaseTable } from "../types";


export type Table = BaseTable
// FIXME not any
export type Routine = any
export type Entity = Table | Routine | string;

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

export type Item = SchemaItem | TableItem | RoutineItem;

export interface BaseItem {
  type: "schema" | "table" | "routine" | "root";
  entity: Entity;
  key: string;
  expanded: boolean;
  hidden: boolean;
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
  entity: Table;
  parent: BaseItem;
  loadingColumns: boolean;
}

export interface RoutineItem extends BaseItem {
  type: "routine";
  entity: Routine;
  parent: BaseItem;
}
