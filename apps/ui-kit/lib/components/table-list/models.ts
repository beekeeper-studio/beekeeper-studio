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
  }
}

export function buildSchemaTables() {
return [
  {
    schema: null,
    skipSchemaDisplay: true,
    tables: [
      {
        name: "cheeses",
        entityType: "table",
        columns: [
          {
            columnName: "id",
            dataType: "INTEGER",
          },
          {
            columnName: "name",
            dataType: "VARCHAR(255)",
          },
          {
            columnName: "origin_country_id",
            dataType: "INTEGER",
          },
          {
            columnName: "cheese_type",
            dataType: "VARCHAR(255)",
          },
          {
            columnName: "description",
            dataType: "TEXT",
          },
          {
            columnName: "first_seen",
            dataType: "DATETIME",
          },
        ],
      },
      { name: "countries", entityType: "table" },
      { name: "neko", entityType: "table" },
      { name: "producers", entityType: "table" },
      { name: "reviews", entityType: "table" },
      { name: "sqlite_sequence", entityType: "table" },
      { name: "stores", entityType: "table" },
      { name: "cheese_summary", entityType: "view" },
    ],
    routines: [],
  },
];
}
