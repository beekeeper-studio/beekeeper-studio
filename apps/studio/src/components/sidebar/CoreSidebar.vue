<template>
  <div class="sidebar-wrap row">
    <global-sidebar
      v-if="!minimalMode"
      @selected="click"
      v-on="$listeners"
      :active-item="activeItem"
    />

    <div class="tab-content">
      <!-- Tables -->
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-show="activeItem === 'tables'"
      >
        <database-dropdown
          @databaseSelected="databaseSelected"
          :connection="connection"
        />
        <table-list />
      </div>

      <!-- History -->
      <div
        class="tab-pane"
        id="tab-history"
        v-show="activeItem === 'history'"
        :class="tabClasses('history')"
      >
        <history-list />
      </div>

      <!-- Favorites -->
      <div
        class="tab-pane"
        id="tab-saved"
        :class="tabClasses('queries')"
        v-show="activeItem === 'queries'"
      >
        <favorite-list />
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

  import { mapState, mapGetters } from 'vuex'
  import rawLog from 'electron-log'

  const log = rawLog.scope('core-sidebar')

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
      ...mapGetters(['minimalMode']),
    },
    watch: {
      minimalMode() {
        if (this.minimalMode) {
          this.activeItem = 'tables'
        }
      },
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
        log.info("Pool database selected", db)
        this.$store.dispatch('changeDatabase', db).catch((e) => {
          this.$noty.error(e.message);
        })
        this.allExpanded = false
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      },
    }
  }
</script>
