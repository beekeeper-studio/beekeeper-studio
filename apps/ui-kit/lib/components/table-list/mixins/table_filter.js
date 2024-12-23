import _ from 'lodash'
import { RoutineTypeNames } from '../lib/db/models'

export default {
  methods: {
    filter(rawTables, allFilters) {
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
  },
  computed: {
    filteredTables() {
      return this.filter(this.tables, this.filterQuery)
    },
    filteredRoutines() {
      return this.filter(this.routines, this.filterQuery)
    }
  }
}
