<template>
  <div class="flex-col expand" ref="wrapper">

    <!-- Filter -->
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input class="filter-input" type="text" placeholder="Filter" v-model="filterQuery">
          <x-buttons class="filter-actions">
            <x-button @click="clearFilter" v-if="filterQuery"><i class="clear material-icons">cancel</i></x-button>
            <x-button :title="entitiesHidden ? 'Filter active' : 'No filters'" class="btn btn-fab btn-link action-item" :class="{active: entitiesHidden}" menu>
              <i class="material-icons">filter_list</i>
              <x-menu style="--target-align: right; --v-target-align: top;">
                <label>
                  <input type="checkbox" v-model="showTables">
                  <span>Tables</span>
                </label>
                <label>
                  <input type="checkbox" v-model="showViews">
                  <span>Views</span>
                </label>
                <label v-if="supportsRoutines">
                  <input type="checkbox" v-model="showRoutines">
                  <span>Routines</span>
                </label>
                <x-menuitem></x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>

    <!-- Pinned -->
    <div v-show="orderedPins.length > 0" class="table-list pinned flex-col" ref="pinned">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <!-- <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span> -->
            <div>Pinned <span class="badge">{{orderedPins.length}}</span></div>
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
        <Draggable v-model="orderedPins" tag="div" ref="pinContainer" class="list-body">
          <div v-for="p in orderedPins" :key="p.id || p.name">
            <table-list-item
              v-if="p.entityType"
              @selected="tableSelected"
              :table="p"
              :connection="connection"
              :container="$refs.pinContainer"
              :forceExpand="allExpanded"
              :forceCollapse="allCollapsed"
              :noSelect="true"
            ></table-list-item>
            <routine-list-item
              v-else
              :routine="p"
              :forceExpand="allExpanded"
              :forceCollapse="allCollapsed"
              :connection="connection"
              :container="$refs.pinContainer"
            >
            </routine-list-item>
          </div>
     

        </Draggable>
      </nav>
    </div>

    <!-- Tables -->
    <hr v-show="pinned.length > 0"> <!-- Fake splitjs Gutter styling -->
    <div v-if="!tablesLoading" class="table-list flex-col" ref="tables">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <!-- <span class="btn-fab open">
              <i class="dropdown-icon material-icons">keyboard_arrow_down</i>
            </span> -->
            <div>Entities
              <span :title="`Total Entities`" class="badge" v-if="!hiddenEntities">{{totalEntities}}</span>
              <span :title="`${hiddenEntities} hidden by filters`" class="badge" v-if="hiddenEntities" :class="{active: entitiesHidden}">{{shownEntities}} / {{totalEntities}}</span>
            </div>
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

        <div class="list-body" ref="entityContainer" v-show="tables.length > 0">
          <div class="with-schemas">
            <TableListSchema
              v-for="(blob, index) in schemaTables"
              :title="blob.schema"
              :key="blob.schema"
              :skipSchemaDisplay="blob.skipSchemaDisplay"
              :expandedInitially="index === 0"
              :forceExpand="allExpanded || filterQuery"
              :forceCollapse="allCollapsed"
            >
              <table-list-item
                
                v-for="table in blob.tables"
                :key="table.name"
                :container="$refs.entityContainer"
                @selected="tableSelected"
                :table="table"
                :connection="connection"
                :forceExpand="allExpanded"
                :forceCollapse="allCollapsed"
              ></table-list-item>
              <routine-list-item
                v-for="routine in blob.routines"
                :key="routine.name"
                :container="$refs.entityContainer"
                :routine="routine"
                :connection="connection"
                :forceExpand="allExpanded"
                :forceCollapse="allCollapsed"
              >
              </routine-list-item>
            </TableListSchema>
          </div>
        </div>

        <!-- TODO (gregory): Make the 'no tables div nicer' -->
        <div class="empty truncate" v-if="!tables || tables.length == 0">
          There are no entities in<br> <span>{{database}}</span>
        </div>
      </nav>
    </div>

    <div class="empty" v-else>
      {{tablesLoading}}
    </div>


  </div>
</template>

<script>
  import TableListItem from './table_list/TableListItem'
  import RoutineListItem from './table_list/RoutineListItem'
  import TableListSchema from './table_list/TableListSchema'
  import Split from 'split.js'
  import { mapState, mapGetters } from 'vuex'
  import TableFilter from '../../../mixins/table_filter'
  import Draggable from 'vuedraggable'

  export default {
    mixins: [TableFilter],
    components: { TableListItem, TableListSchema, RoutineListItem, Draggable },
    data() {
      return {
        tableLoadError: null,
        allExpanded: null,
        allCollapsed: null,
        activeItem: 'tables',
        split: null,
        sizes: [25,75],
        lastPinnedSize: 0,
      }
    },
    computed: {
      totalEntities() {
        return this.tables.length + this.routines.length
      },
      shownEntities() {
        return this.filteredTables.length + this.filteredRoutines.length
      },
      hiddenEntities() {
        return this.totalEntities - this.shownEntities
      },
      entitiesHidden() {
        return !this.showTables || !this.showViews || !this.showRoutines
      },
      filterQuery: {
        get() {
          return this.$store.state.entityFilter.filterQuery
        },
        set(newFilter) {
          this.$store.dispatch('setFilterQuery', newFilter)
        }
      },
      showTables: {
        get() {
          return this.$store.state.entityFilter.showTables
        },
        set() {
          this.$store.commit('showTables')
        }
      },
      showViews: {
        get() {
          return this.$store.state.entityFilter.showViews
        },
        set() {
          this.$store.commit('showViews')
        }
      },
      showRoutines: {
        get() {
          return this.$store.state.entityFilter.showRoutines
        },
        set() {
          this.$store.commit('showRoutines')
        }
      },
      orderedPins: {
        set(newPins) {
          this.$store.commit('setPinned', newPins)
        },
        get() {
          return this.pinned
        }
      },
      pinnedTables() {
        return this.pinned.filter((p) => (p.entityType))
      },
      pinnedRoutines() {
        return this.pinned.filter((p) => (p.type))
      },
      components() {
        return [
          this.$refs.pinned,
          this.$refs.tables
        ]
      },
      supportsRoutines() {
        return this.connection.supportedFeatures().customRoutines
      },
      ...mapState(['selectedSidebarItem', 'tables', 'routines', 'connection', 'database', 'tablesLoading']),
      ...mapGetters(['pinned', 'schemaTables', 'filteredTables', 'filteredRoutines']),
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
      tableSelected() {
        // this.selectedTable = table
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
        this.$store.dispatch('updateRoutines')
      },
      maybeUnselect(e) {
        if (this.selectedSidebarItem) {
          if (this.$refs.wrapper.contains(e.target)) {
            return
          }
          this.$store.commit('selectSidebarItem', null)
        }
      },
    },
    mounted() {
      document.addEventListener('mousedown', this.maybeUnselect)
    },
    beforeDestroy() {
      document.removeEventListener('mousedown', this.maybeUnselect)
      if(this.split) {
        console.log("destroying split")
        this.split.destroy()
      }
    }
  }
</script>
