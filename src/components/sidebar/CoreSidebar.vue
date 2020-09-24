<template>

  <div class="sidebar-wrap row">
    <global-sidebar
      @click="click"
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
        <sidebar-tables-pane></sidebar-tables-pane>
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
    import GlobalSidebar from './GlobalSidebar'
  import HistoryList from './core/HistoryList'
  import FavoriteList from './core/FavoriteList'
  import DatabaseDropdown from './core/DatabaseDropdown'
  import SidebarTablesPane from './core/SidebarTablesPane'

  import { mapState } from 'vuex'

  export default {
    components: { DatabaseDropdown, HistoryList, 
      GlobalSidebar, FavoriteList, SidebarTablesPane
    },
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
