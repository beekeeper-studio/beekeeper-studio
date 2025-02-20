import { Entity, RoutineEntity, SchemaEntity, TableEntity } from "../types";

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

export type Item = RootItem | SchemaItem | TableItem | RoutineItem;

export interface BaseItem {
  type: "schema" | "table" | "routine" | "root";
  entity: Entity;
  key: string;
  expanded: boolean;
  level: number;
  parent?: RootItem | SchemaItem;
  pinned: boolean;
}

export interface RootItem extends BaseItem {
  type: "root";
  entity: SchemaEntity;
}

export interface SchemaItem extends BaseItem {
  type: "schema";
  entity: SchemaEntity;
  parent: RootItem | SchemaItem;
}

export interface TableItem extends BaseItem {
  type: "table";
  entity: TableEntity;
  parent: RootItem | SchemaItem;
  loadingColumns: boolean;
}

export interface RoutineItem extends BaseItem {
  type: "routine";
  entity: RoutineEntity;
  parent: RootItem | SchemaItem;
}

export const SortByValues = ["position", "name"] as const;

