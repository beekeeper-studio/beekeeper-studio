import _ from 'lodash';
import { EntityFilter, RoutineTypeNames, Table } from './models';

export function entityFilter(rawTables: Table[], allFilters: EntityFilter) {
  const tables = rawTables.filter((table) => {
    // return (table.entityType === 'table' && allFilters.showTables &&
    //   ((table.parenttype != 'p' && !allFilters.showPartitions) || allFilters.showPartitions)) ||
    //   (table.entityType === 'view' && allFilters.showViews) ||
    //   (table.entityType === 'materialized-view' && allFilters.showViews) ||
    //   (Object.keys(RoutineTypeNames).includes(table.type) && allFilters.showRoutines)
    return allFilters.showTables
  })

  const { filterQuery } = allFilters
  if (!filterQuery) {
    return tables
  }
  const startsWithFilter = _(tables)
    .filter((item) => _.startsWith(item.name.toLowerCase(), filterQuery.toLowerCase()))
    .value()
  const containsFilter = _(tables)
    .difference(startsWithFilter)
    .filter((item) => item.name.toLowerCase().includes(filterQuery.toLowerCase()))
    .value()
  return _.concat(startsWithFilter, containsFilter)
}
