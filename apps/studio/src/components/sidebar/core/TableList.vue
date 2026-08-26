<template>
  <div
    class="flex-col expand table-list-component"
    ref="wrapper"
  >
    <!-- Filter -->
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input
            class="filter-input"
            type="text"
            placeholder="Filter"
            v-model="filterQuery"
          >
          <div class="filter-actions">
            <button
              class="btn-clear"
              @click.prevent="clearFilter"
              v-if="filterQuery"
              title="Clear Filter"
            >
              <i class="clear material-icons">cancel</i>
            </button>
            <button
              v-if="dialect != 'mongodb'"
              :title="entitiesHidden ? 'Filter active' : 'No filters'"
              class="btn btn-fab btn-link action-item"
              :class="{active: entitiesHidden}"
              @click.prevent.stop="openFilterMenu($event)"
            >
              <i class="material-icons-outlined">filter_alt</i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <x-progressbar
      v-show="tablesLoading"
      style="margin-top: -5px;"
    />

    <!-- Pinned Tables -->
    <div
      class="table-list pinned flex-col"
      ref="pinned"
      v-show="orderedPins.length > 0"
    >
      <pinned-table-list
        :all-expanded="allExpanded"
        :all-collapsed="allCollapsed"
      />
    </div>

    <!-- Tables -->
    <hr v-show="pinnedEntities.length > 0"> <!-- Fake splitjs Gutter styling -->

    <nav
      class="list-group flex-col"
      ref="tables"
    >
      <div class="list-heading">
        <span class="sub">Entities</span>
        <span
          :title="`Total Entities`"
          class="badge"
          v-if="!filterQuery"
        >{{ totalEntities }}</span>
        <span
          :title="`${totalFilteredEntities} hidden by filters`"
          class="badge"
          v-else
          :class="{active: entitiesHidden}"
        >{{ shownEntities }} / {{ totalEntities }}</span>
        <span
          v-show="totalHiddenEntities > 0 && !filterQuery"
          class="hidden-indicator bks-tooltip-wrapper"
        >
          <span class="badge">
            <i class="material-icons">visibility_off</i>
            <span>{{ totalHiddenEntities > 99 ? '99+' : totalHiddenEntities }}</span>
          </span>
          <div class="hi-tooltip bks-tooltip bks-tooltip-bottom-center">
            <span>Right click an entity to hide it. </span>
            <a @click="$modal.show('hidden-entities')">View hidden</a><span>.</span>
          </div>
        </span>
        <div class="actions">
          <button
            @click.prevent="toggleExpandCollapse"
            :title="isExpanded ? 'Collapse All' : 'Expand All'"
            :disabled="tablesLoading"
          >
            <i class="material-icons">{{ isExpanded ? 'unfold_less' : 'unfold_more' }}</i>
          </button>
          <button
            @click.prevent="refreshTables"
            :title="'Refresh'"
            :disabled="tablesLoading"
          >
            <i class="material-icons">refresh</i>
          </button>

          <button
            v-if="!usedConfig?.readOnlyMode"
            class="btn-new-table"
            @click.prevent.stop="openNewTableMenu($event)"
            :title="createDisabled ? `Creating tables is not supported for ${dialect}` : (newTableOrCollection + ' Options')"
            :disabled="tablesLoading || createDisabled"
          >
            <i class="material-icons">add</i>
            <i class="material-icons arrow">arrow_drop_down</i>
          </button>
        </div>
      </div>

      <virtual-table-list />

      <!-- TODO (gregory): Make the 'no tables div nicer' -->
      <div
        class="empty truncate"
        v-if="!tablesLoading && (!tables || tables.length === 0)"
      >
        <p class="no-entities" v-if="database">
          There are no entities in the <strong>{{ database }}</strong> database
        </p>
        <p class="no-entities" v-else>
          Please select a database to see tables, views, and other entities
        </p>
      </div>
    </nav>

    <portal to="modals">
      <HiddenEntitiesModal
        :hidden-entities="hiddenEntities"
        :hidden-schemas="hiddenSchemas"
      />
    </portal>
  </div>
</template>

<script lang="ts">
  import _ from 'lodash'
  import HiddenEntitiesModal from './HiddenEntitiesModal.vue'
  import Split from 'split.js'
  import { mapState, mapGetters } from 'vuex'
  import TableFilter from '../../../mixins/table_filter'
  import TableListContextMenus from '../../../mixins/TableListContextMenus'
  import PinnedTableList from '@/components/sidebar/core/PinnedTableList.vue'
  import { AppEvent } from '@/common/AppEvent'
  import VirtualTableList from './table_list/VirtualTableList.vue'
  import { TableOrView, Routine } from "@/lib/db/models";
  import { matches } from '@/common/transport/TransportPinnedEntity'

  export default {
    mixins: [TableFilter, TableListContextMenus],
    components: { PinnedTableList, HiddenEntitiesModal, VirtualTableList },
    data() {
      return {
        isDev: window.platformInfo.isDevelopment,
        tableLoadError: null,
        allExpanded: null,
        allCollapsed: null,
        isExpanded: false,
        listItemsCollapsed: null,
        activeItem: 'tables',
        split: null,
        sizes: [25,75],
        expandedTables: []
      }
    },
    computed: {
      ...mapGetters(['filteredTables', 'filteredRoutines', 'dialectData', 'dialect']),
      ...mapState({currentDatabase: 'database', 'usedConfig': 'usedConfig'}),
      ...mapState(['selectedSidebarItem', 'tables', 'routines', 'database', 'tablesLoading', 'supportedFeatures', 'connectionType']),
      ...mapGetters({
          pinnedEntities: 'pins/pinnedEntities',
          orderedPins: 'pins/orderedPins',
          totalHiddenEntities: 'hideEntities/totalEntities',
          hiddenEntities: 'hideEntities/databaseEntities',
          hiddenSchemas: 'hideEntities/databaseSchemas'
      }),
      createDisabled() {
        return !!this.dialectData.disabledFeatures.createTable
      },
      newTableOrCollection() {
        // FIXME: shouldn't be doing dialect checks like this.
        if (this.dialect === 'mongodb') return 'New Collection'

        return 'New Table'
      },
      totalEntities() {
        return this.tables.length + this.routines.length - this.hiddenEntities.length
      },
      shownEntities() {
        return this.filteredTables.length + this.filteredRoutines.length
      },
      totalFilteredEntities() {
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
        return this.supportedFeatures.customRoutines
      },
      canCreateTable() {
        return !this.dialectData.disabledFeatures?.createTable
      },
      loadedWithPins() {
        return !this.tablesLoading && this.pinnedEntities.length > 0
      },
      filterMenuOptions() {
        const options: any[] = [
          {
            label: "Tables",
            id: 'tables',
            checked: Boolean(this.showTables),
            keepOpen: true,
            handler: () => {
              this.showTables = !this.showTables
            },
          },
          {
            label: "Views",
            id: 'views',
            checked: Boolean(this.showViews),
            keepOpen: true,
            handler: () => {
              this.showViews = !this.showViews
            },
          },
        ];
        if (this.supportsRoutines) {
          options.push({
            label: "Routines",
            id: 'routines',
            checked: Boolean(this.showRoutines),
            keepOpen: true,
            handler: () => {
              this.showRoutines = !this.showRoutines
            },
          });
        }
        return options;
      },
      rootBindings() {
        return [
          { event: AppEvent.togglePinTableList, handler: this.togglePinTableList },
        ]
      }
    },
    watch: {
      currentDatabase(){
        this.filterQuery = null
      },
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
      clearFilter() {
        this.filterQuery = null
      },
      toggleExpandCollapse() {
        this.isExpanded = !this.isExpanded
        this.trigger(AppEvent.toggleExpandTableList, this.isExpanded)
      },
      // FIXME (azmi): expandedTables is always empty
      refreshExpandedColumns() {
        this.expandedTables.forEach((table) => {
          this.$store.dispatch('updateTableColumns', table)
        })
      },
      refreshPinnedColumns() {
        this.orderedPins.forEach((p) => {
          const t = this.tables.find((table) => matches(p, table))
          if (t) {
            this.$store.dispatch('updateTableColumns', t)
          }
        })
      },
      async refreshTables() {
        try {
          this.$store.dispatch('updateRoutines')
          await this.$store.dispatch('updateTables')
          // When we refresh sidebar tables we need to also refresh:
          // 1. Any open tables
          // 2. Any pinned tables
          this.refreshExpandedColumns()
          this.refreshPinnedColumns()
        } catch (ex) {
          this.$noty.error(`Unable to refresh tables ${ex.message}`)
        }
      },
      openNewTableMenu(event: MouseEvent) {
        if (this.tablesLoading || this.createDisabled) return;
        const options = [
          {
            name: this.newTableOrCollection,
            label: this.newTableOrCollection,
            handler: () => this.newTable(),
          },
          {
            name: `${this.newTableOrCollection} from File`,
            label: `${this.newTableOrCollection} from File`,
            handler: () => this.newTableFromFile(),
          },
        ];
        this.$bks.openMenu({ event, item: null, options });
      },
      newTable() {
        this.$root.$emit(AppEvent.createTable)
      },
      newTableFromFile() {
        this.$root.$emit(AppEvent.createTableFromFile)
      },
      openFilterMenu(event: MouseEvent) {
        this.$bks.openMenu({
          event,
          item: null,
          options: this.filterMenuOptions,
        });
      },
      maybeUnselect(e) {
        if (this.selectedSidebarItem) {
          if (this.$refs.wrapper.contains(e.target)) {
            return
          }
          this.$store.commit('selectSidebarItem', null)
        }
      },
      togglePinTableList(entity: TableOrView | Routine, pinned?: boolean) {
        if (typeof pinned === 'undefined') {
          pinned = !this.pinnedEntities.includes(entity)
        }

        if (pinned) this.$store.dispatch('pins/add', entity)
        else this.$store.dispatch('pins/remove', entity)

        if (pinned && entity.entityType === 'table') {
          this.$store.dispatch('updateTableColumns', entity)
        }
      }
    },
    mounted() {
      const components = [this.$refs.pinned, this.$refs.tables]
      this.split = Split(components, {
        elementStyle: (_dimension, size) => ({
            'flex-basis': `calc(${size}%)`,
        }),
        direction: 'vertical',
        sizes: this.sizes,
      })
      this.registerHandlers(this.rootBindings)
    },
    beforeDestroy() {
      document.removeEventListener('mousedown', this.maybeUnselect)
      if(this.split) {
        this.split.destroy()
      }
      this.unregisterHandlers(this.rootBindings)
    }
  }
</script>
<style scoped>
  .table-action-wrapper{
    display: flex;
    flex-direction: row;
  }
  .settings-btn {
    width: auto;
    padding: 0;
    box-shadow: none;
  }
  p.no-entities {
    width: 100%;
    white-space:normal;
  }
</style>
