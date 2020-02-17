<template>
  <div class="table-list flex-col expand">
    <div class="fixed">

      <div class="filter">
       <div class="filter-wrap">
          <input type="text" placeholder="Filter" v-model="filterQuery">
          <!-- TODO (matthew): clear icon needs to hide when input has no value also. ie. Type then delete characters and still shows currently -->
          <i class="clear material-icons" @click="clearFilter" v-if="filterQuery !== null">cancel</i>
       </div>
      </div>
    </div>

    <nav class="list-group flex-col expand" v-if="tables">
      <table-list-item
        v-for="table in filteredTables"
        v-bind:key="table.name"
        @selected="tableSelected"
        :table="table"
        :connection="connection"
        :selected="table == selectedTable"
        :forceExpand="allExpanded"
        :forceCollapse="allCollapsed"
      ></table-list-item>
    </nav>
    <!-- TODO (gregory): Make the 'no tables div nicer' -->
    <div v-if="!tables || tables.length == 0">
      There are no tables in {{database}}
    </div>

    <span class="expand"></span>

  </div>
</template>

<script>
  import _ from 'lodash'
  import TableListItem from './TableListItem'
  import { mapState } from 'vuex'

  export default {
    components: { TableListItem},
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null,
        activeItem: 'tables'
      }
    },
    computed: {
      filteredTables() {
        if (!this.filterQuery) {
          return this.tables
        }
        const startsWithFilter = _(this.tables)
          .filter((item) => _.startsWith(item.name, this.filterQuery))
          .value()
        const containsFilter = _(this.tables)
          .difference(startsWithFilter)
          .filter((item) => item.name.includes(this.filterQuery))
          .value()
        return _.concat(startsWithFilter, containsFilter)
      },
      ...mapState(['tables', 'connection', 'database']),
    },
    methods: {
      tableSelected(table) {
        this.selectedTable = table
      },
      clearFilter() {
        this.filterQuery = null
      },
      expandAll() {
        this.allExpanded = Date.now()
      },
      collapseAll() {
        this.allCollapsed = Date.now()
      },
      refreshTables() {
        this.$store.dispatch('updateTables')
      }
    }
  }
</script>
