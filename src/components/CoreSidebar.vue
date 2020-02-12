<template>
  <div>
    <div class="fixed">
      <database-dropdown @databaseSelected="databaseSelected" :connection="connection"></database-dropdown>
    </div>
    <div class="nav-tabs nav">
      <li class="nav-item">
        <a
          href=""
          @click.prevent="click('tables')"
          class="nav-link"
          :class="{ active: activeItem === 'tables'}"
        >
          <span class="expand truncate">Tables</span>
        </a>

      </li>
      <li class="nav-item">
        <a
          href=""
          @click.prevent="click('queries')"
          class="nav-link"
          :class="{ active: activeItem === 'queries'}"
        >
          <span class="expand truncate">Queries</span>
        </a>

      </li>
      <li class="nav-item">
        <a
          href=""
          @click.prevent="click('history')"
          class="nav-link"
          :class="{ active: activeItem === 'history'}"
        >
          <span class="expand truncate">History</span>
        </a>
      </li>
    </div>

    <div class="tab-content">
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-if="activeItem === 'tables'"
      >
        <table-list></table-list>

      </div>

      <div
        class="tab-pane"
        id="tab-saved"
        :class="tabClasses('tables')"
        v-if="activeItem === 'queries'"
      >
        TBD - List of Saved Queries
      </div>
      <div
        class="tab-pane"
        id="tab-history"
        v-if="activeItem === 'history'"
        :class="tabClasses('history')"
      >
        <history-list></history-list>
      </div>

    <footer class="status-bar row connected">
      <button class="btn btn-link btn-icon" @click.prevent="disconnect()" v-tooltip="'Disconnect from database'">
        <i class="material-icons">check_circle</i>
        <span>Connected</span>
      </button>
    </footer>
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
