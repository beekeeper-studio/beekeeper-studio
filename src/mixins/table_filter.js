import _ from 'lodash'

export default {
  methods: {
    filterSplitOr(tables, filterQuery) {
      if (!filterQuery) {
        return tables
      }
      const parts = filterQuery.split('|')
      let tmptables = []
      parts.forEach(p => {
        if (p) {
          tmptables = _.concat(tmptables, this.filter(tables, p))
        }
      })
      return _.uniq(tmptables.sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) {
          return -1
        } else if (a.name.toLowerCase() < b.name.toLowerCase()) {
          return 1
        } else {
          return 0
        }
      }), true)
    },
    filter(tables, filterQuery) {
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
      return this.filterSplitOr(this.tables, this.filterQuery)
    },
  }
}
