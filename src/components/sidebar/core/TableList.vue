<template>
  <div class="flex-col expand">
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
              <routine-item
                v-for="routine in filter(blob.routines, filterQuery)"
                :key="routine.routineName"
                :routine="routine"
              >
                </routine-item>
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
              <routine-item
                v-for="routine in filter(blob.routines, filterQuery)"
                :key="routine.routineName"
                :routine="routine"
              >
              </routine-item>
          </div>
        </div>
      </nav>

      <!-- TODO (gregory): Make the 'no tables div nicer' -->
      <div class="empty" v-if="!tables || tables.length == 0">
        There are no tables in <span class="truncate">{{database}}</span>
      </div>
    </div>

    <div class="empty" v-if="tablesLoading">
      {{tablesLoading}}
    </div>

    <!-- Functions -->
    <hr> <!-- Fake splitjs Gutter styling -->

  </div>
</template>

<script>
  import TableListItem from './table_list/TableListItem'
  import TableListSchema from './SchemaContainer'
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
      }
    },
    computed: {
      components() {
        return [
          this.$refs.pinned,
          this.$refs.tables
        ]
      },
      ...mapState(['tables', 'connection', 'database', 'tablesLoading', 'routines']),
      ...mapGetters(['pinned', 'schemaTables', 'tablesHaveSchemas']),
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
