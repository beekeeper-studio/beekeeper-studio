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
        <div class="sidebar-heading">
          <div class="status connected sidebar-title row flex-middle" v-tooltip="'{Connected}'">
            <i class="material-icons">fiber_manual_record</i>
            <span>Connection</span>
          </div>
          <span class="expand"></span>
          <div class="actions">
            <a class="btn-fab"><i class="material-icons">more_horiz</i></a>
          </div>
        </div>
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
          <!-- <div class="actions">
            <a class="btn-fab"><i class="material-icons">more_horiz</i></a>
          </div> -->
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
          <!-- <div class="actions">
            <a class="btn-fab"><i class="material-icons">more_horiz</i></a>
          </div> -->
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
