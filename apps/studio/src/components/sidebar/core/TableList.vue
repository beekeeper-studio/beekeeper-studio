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
              <i class="material-icons-outlined">filter_alt</i>
              <x-menu style="--target-align: right;">
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

    <!-- Pinned Tables -->
    <div class="table-list pinned flex-col" ref="pinned" v-show="orderedPins.length > 0">
      <pinned-table-list
        :allExpanded="allExpanded"
        :allCollapsed="allCollapsed"
        :connection="connection"
      />
    </div>

    <!-- Tables -->
    <hr v-show="pinnedEntities.length > 0"> <!-- Fake splitjs Gutter styling -->
    <div class="table-list flex-col" ref="tables">
      <nav class="list-group flex-col" v-if="!tablesLoading">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div>Entities
              <span :title="`Total Entities`" class="badge" v-if="!hiddenEntities">{{totalEntities}}</span>
              <span :title="`${hiddenEntities} hidden by filters`" class="badge" v-if="hiddenEntities" :class="{active: entitiesHidden}">{{shownEntities}} / {{totalEntities}}</span>
            </div>
          </div>
          <div class="actions">
            <a @click.prevent="toggleExpandCollapse" :title="isExpanded ? 'Collapse All' : 'Expand All'">
              <i class="material-icons">{{isExpanded ? 'unfold_less' : 'unfold_more'}}</i>
            </a>
          
            <a @click.prevent="refreshTables" :title="'Refresh'">
              <i class="material-icons">refresh</i>
            </a>
          </div>
          <div>
            <a @click.prevent="newTable" title="New Table" class="create-table">
              <i class="material-icons">add</i>
            </a>
          </div>
        </div>
        <div class="list-body" ref="entityContainer" v-show="tables.length > 0">
          <div class="with-schemas">
            <sidebar-folder
              v-for="(blob, index) in schemaTables"
              :title="blob.schema"
              :key="blob.schema"
              :skipDisplay="blob.skipSchemaDisplay"
              :expandedInitially="index === 0"
              :forceExpand="allExpanded || filterQuery"
              :forceCollapse="allCollapsed"
            >
              <table-list-item

                v-for="table in blob.tables"
                :key="entityKey(table)"
                :pinned="pinnedEntities.includes(table)"
                :container="$refs.entityContainer"
                @selected="tableSelected"
                :table="table"
                :connection="connection"
                :forceExpand="allExpanded"
                :forceCollapse="listItemsCollapsed"
                @contextmenu.prevent.stop="$bks.openMenu({ item: table, event: $event, options: tableMenuOptions})"
              ></table-list-item>
              <routine-list-item
                v-for="routine in blob.routines"
                :key="entityKey(routine)"
                :pinned="pinnedEntities.includes(routine)"
                :container="$refs.entityContainer"
                :routine="routine"
                :connection="connection"
                :forceExpand="allExpanded"
                :forceCollapse="listItemsCollapsed"
                @contextmenu.prevent.stop="$bks.openMenu({item: routine, event: $event, options: routineMenuOptions})"
              >
              </routine-list-item>
            </sidebar-folder>
          </div>
        </div>

        <!-- TODO (gregory): Make the 'no tables div nicer' -->
        <div class="empty truncate" v-if="!tables || tables.length === 0">
          There are no entities in<br> <span>{{database}}</span>
        </div>
      </nav>
      <div class="empty" v-else>
        {{tablesLoading}}
      </div>

    </div>
  </div>
</template>

<script>
  import TableListItem from './table_list/TableListItem'
  import RoutineListItem from './table_list/RoutineListItem'
  import Split from 'split.js'
  import { mapState, mapGetters } from 'vuex'
  import TableFilter from '../../../mixins/table_filter'
  import TableListContextMenus from '../../../mixins/TableListContextMenus'
  import PinnedTableList from '@/components/sidebar/core/PinnedTableList.vue'
  import SidebarFolder from '@/components/common/SidebarFolder.vue'
  import { AppEvent } from '@/common/AppEvent'
  export default {
    mixins: [TableFilter, TableListContextMenus],
    components: { TableListItem, RoutineListItem, PinnedTableList, SidebarFolder },
    data() {
      return {
        tableLoadError: null,
        allExpanded: null,
        allCollapsed: null,
        isExpanded: false,
        listItemsCollapsed: null,
        activeItem: 'tables',
        split: null,
        sizes: [25,75],

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
      components() {
        return [
          this.$refs.pinned,
          this.$refs.tables
        ]
      },
      supportsRoutines() {
        return this.connection.supportedFeatures().customRoutines
      },
      loadedWithPins() {
        return !this.tablesLoading && this.pinnedEntities.length > 0
      },
      ...mapState(['selectedSidebarItem', 'tables', 'routines', 'connection', 'database', 'tablesLoading']),
      ...mapGetters(['schemaTables', 'filteredTables', 'filteredRoutines']),
      ...mapGetters({
          pinnedEntities: 'pins/pinnedEntities',
          orderedPins: 'pins/orderedPins',
      }),
    },
    watch: {
      loadedWithPins (loaded, oldloaded) {
        if (loaded && (!oldloaded)) {
          this.$nextTick(() => {
            this.split.setSizes(this.sizes);
          });
        } else if (!loaded) {
          // this.split.destroy();
        }
      },
    },
    methods: {
      entityKey(entity) {
        const key = [entity.schema, entity.name, entity.entityType].filter((v) => !!v)
        return key.join(".")
      },
      tableSelected() {
        // this.selectedTable = table
      },
      clearFilter() {
        this.filterQuery = null
      },
      toggleExpandCollapse() {
        if(!this.isExpanded) {
          this.isExpanded = true
           this.listItemsCollapsed = null;
        this.allExpanded = Date.now()
        } else {
          this.isExpanded = false
           if (this.listItemsCollapsed) {
          this.allCollapsed = Date.now()
        } else {
          this.listItemsCollapsed = Date.now()
        }
        }
      },
      refreshTables() {
        this.$store.dispatch('updateTables')
        this.$store.dispatch('updateRoutines')
      },
      newTable() {
        this.$root.$emit(AppEvent.createTable)
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
      this.split = Split(this.components, {
        elementStyle: (dimension, size) => ({
            'flex-basis': `calc(${size}%)`,
        }),
        direction: 'vertical',
        sizes: this.sizes,
      })
    },
    beforeDestroy() {
      document.removeEventListener('mousedown', this.maybeUnselect)
      if(this.split) {
        this.split.destroy()
      }
    }
  }
</script>
