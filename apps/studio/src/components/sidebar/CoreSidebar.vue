<template>
  <div class="sidebar-wrap row">
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
  import TableList from './core/TableList.vue'
  import HistoryList from './core/HistoryList.vue'
  import FavoriteList from './core/FavoriteList.vue'
  import DatabaseDropdown from './core/DatabaseDropdown.vue'

  import { mapState, mapGetters, mapActions } from 'vuex'
  import rawLog from '@bksLogger'

  const log = rawLog.scope('core-sidebar')

  export default {
    components: { TableList, DatabaseDropdown, HistoryList, FavoriteList},
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null,
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
      ...mapState("sidebar", {
        "activeItem": "globalSidebarActiveItem",
        "sidebarShown": "primarySidebarOpen",
      }),
      ...mapState(['tables', 'database']),
      ...mapGetters(['minimalMode']),
    },
    watch: {
      minimalMode() {
        if (this.minimalMode) {
          this.setActiveItem('tables')
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
      ...mapActions({
        setActiveItem: "sidebar/setGlobalSidebarActiveItem",
        setPrimarySidebarOpen: "sidebar/setPrimarySidebarOpen",
      }),
    }
  }
</script>
