import _ from 'lodash'

export default {
  methods: {
    filter(tables, filterQuery) {
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
  }
}
