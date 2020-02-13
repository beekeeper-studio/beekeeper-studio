<template>

  <div class="sidebar-wrap row"> 
    <div class="global-items">
      <a
        href=""
        @click.prevent="click('tables')"
        class="nav-item"
        :class="{ active: activeItem === 'tables'}"
        v-tooltip="'Connection'"
      >
        <span class="material-icons">filter_none</span>
      </a>
      <a
        href=""
        @click.prevent="click('history')"
        class="nav-item"
        :class="{ active: activeItem === 'history'}"
        v-tooltip="'History'"
      >
        <span class="material-icons">history</span>
      </a>
      <a
        href=""
        @click.prevent="click('queries')"
        class="nav-item"
        :class="{ active: activeItem === 'queries'}"
        v-tooltip="'Favorite'"
      >
        <span class="material-icons">star</span>
      </a>
    </div>

    <div class="tab-content">

      <!-- Connection -->
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-if="activeItem === 'tables'"
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
        v-if="activeItem === 'history'"
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
        :class="tabClasses('tables')"
        v-if="activeItem === 'queries'"
      >
        <div class="sidebar-heading fixed row">
          <span class="sub expand">Favorites</span>
        </div>
        <span>TBD - List of Saved Queries</span>
      </div>
    </div>
      
  </div>
</template>

<script>
  import _ from 'lodash'
  import TableList from './TableList'
  import HistoryList from './HistoryList'
  import DatabaseDropdown from './DatabaseDropdown'
  import { mapState } from 'vuex'

  export default {
    components: { TableList, DatabaseDropdown, HistoryList },
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
