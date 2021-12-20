import _ from 'lodash'
import { identify } from 'sql-query-identifier'
import { EntityFilter } from '@/store/models'
import { RoutineTypeNames } from "./models"

export function splitQueries(queryText: string, dialect) {
  if(_.isEmpty(queryText.trim())) {
    return []
  }
  const result = identify(queryText, { strict: false, dialect })
  return result
}

export function entityFilter(rawTables: any[], allFilters: EntityFilter) {
  const tables = rawTables.filter((table) => {
    return (table.entityType === 'table' && allFilters.showTables) ||
      (table.entityType === 'view' && allFilters.showViews) ||
      (table.entityType === 'materialized-view' && allFilters.showViews) ||
      (Object.keys(RoutineTypeNames).includes(table.type) && allFilters.showRoutines)
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
