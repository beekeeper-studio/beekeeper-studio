<template>

  <div class="sidebar-wrap row">
    <global-sidebar
      @selected="click"
      v-on="$listeners"
      :activeItem="activeItem"
    ></global-sidebar>

    <div class="tab-content">


      <!-- Tables -->
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-show="activeItem === 'tables'"
      >
        <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>
        <table-list></table-list>
      </div>

      <!-- History -->
      <div
        class="tab-pane"
        id="tab-history"
        v-show="activeItem === 'history'"
        :class="tabClasses('history')"
      >
        <div class="sidebar-heading">
          <span class="sidebar-title">History</span>
          <span class="expand"></span>
        </div>
        <history-list></history-list>
      </div>

      <!-- Favorites -->
      <div
        class="tab-pane"
        id="tab-saved"
        :class="tabClasses('queries')"
        v-show="activeItem === 'queries'"
      >
        <div class="sidebar-heading">
          <span class="sidebar-title">Saved Queries</span>
          <span class="expand"></span>
        </div>
        <favorite-list></favorite-list>
      </div>

    </div>

  </div>
</template>

<script>
  import _ from 'lodash'
  import GlobalSidebar from './GlobalSidebar'
  import TableList from './core/TableList'
  import HistoryList from './core/HistoryList'
  import FavoriteList from './core/FavoriteList'
  import DatabaseDropdown from './core/DatabaseDropdown'

  import { mapState } from 'vuex'

  export default {
    props: ['sidebarShown'],
    components: { TableList, DatabaseDropdown, HistoryList, GlobalSidebar, FavoriteList},
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null,
        activeItem: 'tables',
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
      tabClasses(item) {
        return {
          show: (this.activeItem === item),
          active: (this.activeItem === item)
        }
      },
      click(item) {
        this.activeItem = item;
        if(!this.sidebarShown) {
          this.$emit('toggleSidebar')
        }
      },
      async databaseSelected(db) {
        await this.$store.dispatch('changeDatabase', db)
        this.allExpanded = false
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      },
    }
  }
</script>
