<template>
  <div>
    <!-- TODO (gregory) This stuff shouldn't scroll -->
    <div class="shouldnt-scroll">
      <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>

      <div class="sidebar-heading">
        <span class="expand">Tables</span>
        <span class="right">
          <a @click.prevent="refreshTables" v-tooltip="'Refresh Tables'">
            <i class="material-icons">refresh</i>
          </a>
          <a @click.prevent="collapseAll" v-tooltip="'Collapse all tables'">
            <i class="material-icons">remove</i>
          </a>
          <a @click.prevent="expandAll" v-tooltip="'Expand all tables'">
            <i class="material-icons">add</i>
          </a>
        </span>
      </div>

      <div class="search-wrap">
        <!-- TODO (gregory) -> have an (x) button at the end of the input box
        bind to the 'clearFilter' method below -->
        <input type="text" placeholder="Filter" v-model="filterQuery">
      </div>
      
    </div>

    <nav class="list-group flex-col" v-if="tables">
      <!-- TODO (gregory) open the 'performance_schema' db  -->
      <!-- Tables with long names require horizontal scrolling -->
      <!--  This whole div shouldn't horizontal scroll, just cut-off the table names -->
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
    <!-- TODO (gregory): Make the disconnect button nicer  -->
    <!--  Maybe move the 'bottom bar' so it's just in the sidebar then it can have a disconnect button -->
    <!-- maybe the disconnect button is a power button? -->
    <div class="stick-to-bottom">
      <button class="btn btn-primary" @click.prevent="disconnect()">disconnect</button>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import TableListItem from './TableListItem.vue'
  import DatabaseDropdown from './DatabaseDropdown.vue'
  import { mapState } from 'vuex'

  export default {
    components: { TableListItem, DatabaseDropdown },
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null
      }
    },
    mounted() {
      this.$store.dispatch('updateTables')
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
      async databaseSelected(db) {
        await this.$store.dispatch('changeDatabase', db)
        this.allExpanded = false
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      },
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
