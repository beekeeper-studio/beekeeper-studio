<template>

  <div class="sidebar-wrap row"> 
    <global-sidebar
      @click="click"
      :activeItem="activeItem"
    ></global-sidebar>

    <div class="tab-content">


      <!-- Connection -->
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-show="activeItem === 'tables'"
      >
        <div class="fixed">
          <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>
        </div>
        <table-list></table-list>
        <footer class="status-bar row connected">
          <!-- <button class="btn btn-link btn-icon" @click.prevent="disconnect()" v-tooltip="'Disconnect from database'">
            <span>Connected</span>
          </button> -->
          <span>Connected</span>
          <span class="expand"></span>
          <span class="actions">
            <a @click.prevent="collapseAll" v-tooltip="'Collapse all tables'">
              <i class="material-icons">unfold_less</i>
            </a>
            <!-- <a @click.prevent="expandAll" v-tooltip="'Expand all tables'">
              <i class="material-icons">unfold_more</i>
            </a> -->
            <a @click.prevent="refreshTables" v-tooltip="'Refresh Tables'">
              <i class="material-icons">refresh</i>
            </a>
            <a v-tooltip="'Menu'">
              <i class="material-icons">more_horiz</i>
            </a>
          </span>
        </footer>
      </div>

      <!-- History -->
      <div
        class="tab-pane"
        id="tab-history"
        v-show="activeItem === 'history'"
        :class="tabClasses('history')"
      >
        <div class="sidebar-heading fixed row">
          <span class="sub expand">History</span>
          <div class="actions">
            <a><i class="material-icons">more_horiz</i></a>
          </div>
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
        <div class="sidebar-heading fixed row">
          <span class="sub expand">Favorites</span>
        </div>
        <favorite-list></favorite-list>
      </div>
    </div>
      
  </div>
</template>

<script>
  import _ from 'lodash'
  import GlobalSidebar from './GlobalSidebar'
  import TableList from './TableList'
  import HistoryList from './HistoryList'
  import FavoriteList from './FavoriteList'
  import DatabaseDropdown from './DatabaseDropdown'
  import { mapState } from 'vuex'

  export default {
    components: { TableList, DatabaseDropdown, HistoryList, GlobalSidebar, FavoriteList },
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
      tabClasses(item) {
        return {
          show: (this.activeItem === item),
          active: (this.activeItem === item)
        }
      },
      click(item) {
        this.activeItem = item;
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
