<template>
  <div class="flex-col expand">

    <!-- Filter -->
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input type="text" placeholder="Filter" v-model="filterQuery">
          <!-- TODO (matthew): clear icon needs to hide when input has no value also. ie. Type then delete characters and still shows currently -->
          <i class="clear material-icons" @click="clearFilter" v-if="filterQuery">cancel</i>
        </div>
      </div>
    </div>

    <!-- Pinned -->
    <div v-if="pinned.length > 0" class="table-list pinned flex-col">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span>
            <span>Pinned</span>
          </div>
          <!-- <div class="actions">
            <a @click.prevent="collapseAll" v-tooltip="'Collapse All'">
              <i class="material-icons">unfold_less</i>
            </a>
            <a @click.prevent="expandAll" v-tooltip="'Expand All'">
              <i class="material-icons">unfold_more</i>
            </a>
            <a @click.prevent="refreshTables" v-tooltip="'Refresh'">
              <i class="material-icons">refresh</i>
            </a>
          </div> -->
        </div>
        <div class="list-body">
          <table-list-item
            v-for="table in pinned"
            v-bind:key="table.name"
            @selected="tableSelected"
            :table="table"
            :connection="connection"
            :selected="table == selectedTable"
            :forceExpand="allExpanded"
            :forceCollapse="allCollapsed"
          ></table-list-item>
        </div>
      </nav>
    </div>

    <!-- Tables -->
    <div v-if="tables" class="table-list flex-col">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span>
            <span>Tables</span>
          </div>
          <div class="actions">
            <a @click.prevent="collapseAll" v-tooltip="'Collapse All'">
              <i class="material-icons">unfold_less</i>
            </a>
            <a @click.prevent="expandAll" v-tooltip="'Expand All'">
              <i class="material-icons">unfold_more</i>
            </a>
            <a @click.prevent="refreshTables" v-tooltip="'Refresh'">
              <i class="material-icons">refresh</i>
            </a>
          </div>
        </div>
        <div class="list-body">
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
        </div>
      </nav>

      <!-- TODO (gregory): Make the 'no tables div nicer' -->
      <div class="empty" v-if="!tables || tables.length == 0">
        There are no tables in <span class="truncate">{{database}}</span>
      </div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import TableListItem from './TableListItem'
  import { mapState, mapGetters } from 'vuex'

  export default {
    components: { TableListItem},
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
      ...mapGetters(['pinned']),
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
