<template>
  <div
    class="table-list-component"
    ref="wrapper"
  >
    <!-- Filter -->
    <div class="filter-wrap">
      <input
        class="filter-input"
        type="text"
        placeholder="Filter"
        v-model="filterQuery"
      >
      <x-buttons class="filter-actions">
        <x-button
          @click="clearFilter"
          v-if="filterQuery"
        >
          <i class="clear material-icons">cancel</i>
        </x-button>
        <x-button
          :title="entitiesHidden ? 'Filter active' : 'No filters'"
          class="btn btn-fab btn-link action-item"
          :class="{active: entitiesHidden}"
          menu
        >
          <i class="material-icons-outlined">filter_alt</i>
          <x-menu style="--target-align: right;">
            <label>
              <input
                type="checkbox"
                v-model="showTables"
              >
              <span>Tables</span>
            </label>
            <label>
              <input
                type="checkbox"
                v-model="showViews"
              >
              <span>Views</span>
            </label>
            <label v-if="supportsRoutines">
              <input
                type="checkbox"
                v-model="showRoutines"
              >
              <span>Routines</span>
            </label>
            <x-menuitem />
          </x-menu>
        </x-button>
      </x-buttons>
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
            @click.prevent="newTable"
            title="New Table"
            class="create-table"
            :disabled="tablesLoading"
            v-if="canCreateTable"
          >
            <i class="material-icons">add</i>
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
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import Split from 'split.js'
import TableFilter from './mixins/table_filter'
import TableListContextMenus from './mixins/TableListContextMenus'
import PinnedTableList from './PinnedTableList.vue'
import VirtualTableList from './VirtualTableList.vue'
import { entityFilter } from './sql_tools'

// TODO(@day): to remove
// import { mapState, mapGetters } from 'vuex'

// FIXME(@azmi): do something
// import { AppEvent } from '@/common/AppEvent'

// TODO(@azmi): make new types instead
// import { TableOrView, Routine } from "@/lib/db/models";

// TODO(@azmi): make a new util function insteaed
// import { matches } from '@/common/transport/TransportPinnedEntity'

export default {
  mixins: [TableFilter, TableListContextMenus],
  components: { PinnedTableList, VirtualTableList },
  props: {
    tables: {
      type: Array,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => []
    },
    // this might just be for us, maybe make a default for others and allow overrides?
    dialectData: {

    }
  },
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
      expandedTables: [],
      entityFilter: {
        filterQuery: null,
        showTables: true,
        showViews: true,
        showRoutines: true,
        showPartitions: false
      }
    }
  },
  computed: {
    createDisabled() {
      // FIXME
      return false
      // return !!this.dialectData.disabledFeatures.createTable
    },
    totalEntities() {
      return this.tables.length + this.routines.length
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
    filteredTables() {
      return entityFilter(this.tables, this.entityFilter);
    },
    filteredRoutines() {
      return entityFilter(this.routines, this.entityFilter);
    },
    filterQuery: {
      get() {
        return this.entityFilter.filterQuery;
      },
      set(newFilter) {
        this.entityFilter.filterQuery = newFilter;
      }
    },
    showTables: {
      get() {
        return this.entityFilter.showTables;
      },
      set() {
        this.entityFilter.showTables = !this.entityFilter.showTables;
      }
    },
    showViews: {
      get() {
        return this.entityFilter.showViews;
      },
      set() {
        this.entityFilter.showViews = !this.entityFilter.showViews;
      }
    },
    showRoutines: {
      get() {
        return this.entityFilter.showRoutines;
      },
      set() {
        this.entityFilter.showRoutines = !this.entityFilter.showRoutines;
      }
    },
    components() {
      return [
        this.$refs.pinned,
        this.$refs.tables
      ]
    },
    async supportsRoutines() {
      // TODO(@azmi): do something
      // return this.supportedFeatures.customRoutines
      return false
    },
    canCreateTable() {
      // FIXME
      return false
      // return !this.dialectData.disabledFeatures?.createTable
    },
    loadedWithPins() {
      return !this.tablesLoading && this.pinnedEntities.length > 0
    },
    rootBindings() {
      return [
        // { event: AppEvent.togglePinTableList, handler: this.togglePinTableList },
      ]
    },
    tables() {
      return [{"name":"cheeses","entityType":"table","columns":[{"tableName":"cheeses","columnName":"id","dataType":"INTEGER","nullable":true,"defaultValue":null,"ordinalPosition":0,"hasDefault":false,"generated":false,"bksField":{"name":"id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"name","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":1,"hasDefault":false,"generated":false,"bksField":{"name":"name","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"origin_country_id","dataType":"INTEGER","nullable":false,"defaultValue":null,"ordinalPosition":2,"hasDefault":false,"generated":false,"bksField":{"name":"origin_country_id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"cheese_type","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":3,"hasDefault":false,"generated":false,"bksField":{"name":"cheese_type","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"description","dataType":"TEXT","nullable":true,"defaultValue":null,"ordinalPosition":4,"hasDefault":false,"generated":false,"bksField":{"name":"description","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"first_seen","dataType":"DATETIME","nullable":true,"defaultValue":null,"ordinalPosition":5,"hasDefault":false,"generated":false,"bksField":{"name":"first_seen","bksType":"UNKNOWN"}}]},{"name":"countries","entityType":"table"},{"name":"neko","entityType":"table"},{"name":"producers","entityType":"table"},{"name":"reviews","entityType":"table"},{"name":"sqlite_sequence","entityType":"table"},{"name":"stores","entityType":"table"},{"name":"cheese_summary","entityType":"view"}]
      return [] // FIXME temp
    },
    routines() {
      return [] // FIXME temp
    },
    pinnedEntities() {
      return [] // FIXME temp
    },
    orderedPins() {
      return [] // FIXME temp
    },
    // ...mapState(['selectedSidebarItem', 'tables', 'routines', 'database', 'tablesLoading', 'supportedFeatures']),
    // ...mapGetters(['dialectData']),
    // ...mapGetters({
    //     pinnedEntities: 'pins/pinnedEntities',
    //     orderedPins: 'pins/orderedPins',
    //     totalHiddenEntities: 'hideEntities/totalEntities',
    // }),
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
    clearFilter() {
      this.filterQuery = null
    },
    toggleExpandCollapse() {
      this.isExpanded = !this.isExpanded
      // this.trigger(AppEvent.toggleExpandTableList, this.isExpanded)
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
    newTable() {
      // this.$root.$emit(AppEvent.createTable)
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
    document.addEventListener('mousedown', this.maybeUnselect)
    const components = [this.$refs.pinned, this.$refs.tables]
    this.split = Split(components, {
      elementStyle: (_dimension, size) => ({
          'flex-basis': `calc(${size}%)`,
      }),
      direction: 'vertical',
      sizes: this.sizes,
    })
    // FIXME
    // this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeUnselect)
    if(this.split) {
      this.split.destroy()
    }
    // FIXME
    // this.unregisterHandlers(this.rootBindings)
  }
}
</script>
<style scoped>
  .table-action-wrapper{
    display: flex;
    flex-direction: row;
  }
  p.no-entities {
    width: 100%;
    white-space:normal;
  }
</style>
