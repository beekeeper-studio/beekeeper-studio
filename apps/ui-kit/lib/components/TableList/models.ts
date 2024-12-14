export interface EntityFilter {
  filterQuery?: string
  showTables: boolean
  showViews: boolean
  showRoutines: boolean,
  showPartitions: boolean
}

export const RoutineTypeNames = {
  'function': "Function",
  'window': "Window Function",
  'aggregate': "Aggregate Function",
  'procedure': "Stored Procedure"
};
