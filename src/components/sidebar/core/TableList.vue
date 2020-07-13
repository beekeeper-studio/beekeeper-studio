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
    <div v-show="pinned.length > 0" class="table-list pinned flex-col" ref="pinned">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <!-- <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span> -->
            <div>Pinned <span class="badge">{{pinned.length}}</span></div>
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

    <hr v-show="pinned.length > 0"> <!-- Fake splitjs Gutter styling -->

    <!-- Tables -->
    <div v-if="!tablesLoading" class="table-list flex-col" ref="tables">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <!-- <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span> -->
            <div>Tables & Views <span class="badge">{{tables.length}}</span></div>
          </div>
          <div class="actions">
            <a @click.prevent="collapseAll" :title="'Collapse All'">
              <i class="material-icons">unfold_less</i>
            </a>
            <a @click.prevent="expandAll" :title="'Expand All'">
              <i class="material-icons">unfold_more</i>
            </a>
            <a @click.prevent="refreshTables" :title="'Refresh'">
              <i class="material-icons">refresh</i>
            </a>
          </div>
        </div>
        <div class="list-body">
          <div class="with-schemas" v-if="tablesHaveSchemas">
            <TableListSchema 
              v-for="(blob, index) in schemaTables"
              :title="blob.schema"
              :key="blob.schema"
              :expandedInitially="index === 0"
              :forceExpand="allExpanded || filterQuery"
              :forceCollapse="allCollapsed"
            >
              <table-list-item
                v-for="table in filter(blob.tables, filterQuery)"
                :key="table.name"
                @selected="tableSelected"
                :table="table"
                :connection="connection"
                :selected="table == selectedTable"
                :forceExpand="allExpanded"
                :forceCollapse="allCollapsed"
              ></table-list-item>
            </TableListSchema>
          </div>
          <div v-else>
            <table-list-item
              v-for="table in filteredTables"
              :key="table.name"
              @selected="tableSelected"
              :table="table"
              :connection="connection"
              :selected="table == selectedTable"
              :forceExpand="allExpanded"
              :forceCollapse="allCollapsed"
            ></table-list-item>
          </div>
        </div>
      </nav>

      <!-- TODO (gregory): Make the 'no tables div nicer' -->
      <div class="empty" v-if="!tables || tables.length == 0">
        There are no tables in <span class="truncate">{{database}}</span>
      </div>
    </div>
    <div class="empty" v-else>
      {{tablesLoading}}
    </div>
  </div>
</template>

<script>
  import TableListItem from './table_list/TableListItem'
  import TableListSchema from './table_list/TableListSchema'
  import Split from 'split.js'
  import { mapState, mapGetters } from 'vuex'
  import TableFilter from '../../../mixins/table_filter'

  export default {
    mixins: [TableFilter],
    components: { TableListItem, TableListSchema },
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null,
        activeItem: 'tables',
        split: null,
        sizes: [25,75],
        lastPinnedSize: 0
      }
    },
    computed: {
      components() {
        return [
          this.$refs.pinned,
          this.$refs.tables
        ]
      },
      ...mapState(['tables', 'connection', 'database', 'tablesLoading']),
      ...mapGetters(['pinned', 'schemaTables', 'tablesHaveSchemas']),
    },
    watch: {
      pinned: {
        deep: true,
        handler(newPinned) {
          if (newPinned.length > 0 && this.lastPinnedSize === 0) {
            this.$nextTick(() => {
              this.split.setSizes(this.sizes);
            });
          } else if (newPinned.length === 0) {
            // this.split.destroy();
          }
          this.lastPinnedSize = newPinned.length
        }
      },
      tablesLoading() {
        if (!this.tablesLoading) {
          this.$nextTick(() => {
            this.split = Split(this.components, {
              elementStyle: (dimension, size) => ({
                  'flex-basis': `calc(${size}%)`,
              }),
              direction: 'vertical',
              sizes: this.sizes,
            })

          })
        }
      }
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
    },
    mounted() {

    },
    beforeDestroy() {
      if(this.split) {
        console.log("destroying split")
        this.split.destroy()
      }
    }
  }
</script>
