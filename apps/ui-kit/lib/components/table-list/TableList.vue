<template>
  <div
    class="BksUiKit BksTableList"
    ref="wrapper"
  >

    <!-- Filter -->
    <div class="filter">
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
            v-show="false"
            :title="entitiesHidden ? 'Filter active' : 'No filters'"
            class="btn btn-fab btn-link action-item"
            :class="{active: entitiesHidden}"
            menu
          >
            <i class="material-icons-outlined">filter_alt</i>
            <!-- FIXME commenting this because it freezes chrome. but it works in firefox.. -->
            <!-- <x-menu style="--target-align: right;"> -->
            <!--   <label> -->
            <!--     <input -->
            <!--       type="checkbox" -->
            <!--       v-model="showTables" -->
            <!--     > -->
            <!--     <span>Tables</span> -->
            <!--   </label> -->
            <!--   <label> -->
            <!--     <input -->
            <!--       type="checkbox" -->
            <!--       v-model="showViews" -->
            <!--     > -->
            <!--     <span>Views</span> -->
            <!--   </label> -->
            <!--   <label v-if="supportsRoutines"> -->
            <!--     <input -->
            <!--       type="checkbox" -->
            <!--       v-model="showRoutines" -->
            <!--     > -->
            <!--     <span>Routines</span> -->
            <!--   </label> -->
            <!--   <x-menuitem /> -->
            <!-- </x-menu> -->
          </x-button>

        </x-buttons>
      </div>
    </div>

    <x-progressbar
      v-show="tablesLoading"
      style="margin-top: -5px;"
    />

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
            @click.prevent="$emit('bks-refresh-btn-click')"
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

      <virtual-table-list
        :tables="filteredTables"
        :expanded="isExpanded"
        @expand="handleExpand"
        @expand-all="handleToggleExpandedAll"
        @dblclick="handleDblClick"
        @contextmenu="handleContextMenu"
        @update-columns="handleUpdateColumns"
      />

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
// import "xel/xel";
import Vue, { PropType } from 'vue';
import _ from 'lodash'
import TableFilter from './mixins/table_filter'
import VirtualTableList from './VirtualTableList.vue'
import { entityFilter } from './sql_tools'
import { Item, Table } from "./models";
import { TableListEvents } from "./constants";
import { RootEventMixin } from "../mixins/RootEvent";
import { writeClipboard } from "../../utils/clipboard";
import { openMenu, MenuItem, CustomMenuItems, useCustomMenuItems } from "../context-menu/menu";
import ProxyEmit from "../mixins/ProxyEmit";

// TODO(@day): to remove
// import { mapState, mapGetters } from 'vuex'

// FIXME(@azmi): do something
// import { AppEvent } from '@/common/AppEvent'

// TODO(@azmi): make new types instead
// import { TableOrView, Routine } from "@/lib/db/models";

export default Vue.extend({
  mixins: [TableFilter, RootEventMixin, ProxyEmit],
  components: { VirtualTableList },
  props: {
    tables: {
      type: Array as PropType<Table[]>,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => []
    },
    schemaContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    tableContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    routineContextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    // this might just be for us, maybe make a default for others and allow overrides?
    dialectData: {

    }
  },
  data() {
    return {
      tableLoadError: null,
      isExpanded: false,
      listItemsCollapsed: null,
      activeItem: 'tables',
      sizes: [25,75],
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
    supportsRoutines() {
      // TODO(@azmi): do something
      // return this.supportedFeatures.customRoutines
      return false
    },
    canCreateTable() {
      // FIXME
      return true
      // return !this.dialectData.disabledFeatures?.createTable
    },
    // tables() {
    //   return [{"name":"cheeses","entityType":"table","columns":[{"tableName":"cheeses","columnName":"id","dataType":"INTEGER","nullable":true,"defaultValue":null,"ordinalPosition":0,"hasDefault":false,"generated":false,"bksField":{"name":"id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"name","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":1,"hasDefault":false,"generated":false,"bksField":{"name":"name","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"origin_country_id","dataType":"INTEGER","nullable":false,"defaultValue":null,"ordinalPosition":2,"hasDefault":false,"generated":false,"bksField":{"name":"origin_country_id","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"cheese_type","dataType":"VARCHAR(255)","nullable":false,"defaultValue":null,"ordinalPosition":3,"hasDefault":false,"generated":false,"bksField":{"name":"cheese_type","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"description","dataType":"TEXT","nullable":true,"defaultValue":null,"ordinalPosition":4,"hasDefault":false,"generated":false,"bksField":{"name":"description","bksType":"UNKNOWN"}},{"tableName":"cheeses","columnName":"first_seen","dataType":"DATETIME","nullable":true,"defaultValue":null,"ordinalPosition":5,"hasDefault":false,"generated":false,"bksField":{"name":"first_seen","bksType":"UNKNOWN"}}]},{"name":"countries","entityType":"table"},{"name":"neko","entityType":"table"},{"name":"producers","entityType":"table"},{"name":"reviews","entityType":"table"},{"name":"sqlite_sequence","entityType":"table"},{"name":"stores","entityType":"table"},{"name":"cheese_summary","entityType":"view"}]
    //   return [] // FIXME temp
    // },
    routines() {
      return [] // FIXME temp
    },
    // ...mapState(['selectedSidebarItem', 'tables', 'routines', 'database', 'tablesLoading', 'supportedFeatures']),
    // ...mapGetters(['dialectData']),
    // ...mapGetters({
    //     totalHiddenEntities: 'hideEntities/totalEntities',
    // }),
    tableMenuOptions() {
      return [
        {
          name: "Copy Name",
          slug: 'copy-name',
          handler({ item }) {
            writeClipboard(item.name)
          },
        },
      ]
    },
    routineMenuOptions() {
      return [
        {
          name: "Copy Name",
          slug: 'copy-name',
          handler({ item }) {
            writeClipboard(item.name)
          },
        },
      ]
    }
  },
  methods: {
    clearFilter() {
      this.filterQuery = null
    },
    toggleExpandCollapse() {
      this.isExpanded = !this.isExpanded
      this.trigger(TableListEvents.toggleExpandTableList, this.isExpanded)
    },
    newTable() {
      this.$emit('bks-add-btn-click')
    },
    async handleExpand(item: Item) {
      if (item.expanded) {
        this.$emit('bks-item-expand', item.entity)
      } else {
        this.$emit('bks-item-collapse', item.entity)
      }
    },
    handleExpandAll(expand: boolean) {
      if (expand) {
        this.$emit('bks-expand-all')
      } else {
        this.$emit('bks-collapse-all')
      }
    },
    handleDblClick(_e, item: Item) {
      this.$emit('bks-item-dblclick', item.entity)
    },
    handleContextMenu(event, item: Item) {
      this.$emit('bks-item-contextmenu', item.entity)
      let items: MenuItem[]
      if(item.type === 'schema') {
        items = useCustomMenuItems(event, [], this.schemaContextMenuItems)
      } else if(item.type === 'table') {
        items = useCustomMenuItems(event, this.tableMenuOptions, this.tableContextMenuItems)
      } else {
        items = useCustomMenuItems(event, this.routineMenuOptions, this.routineContextMenuItems)
      }
      openMenu({ options: items, item: item.entity, event })
    },
    handleUpdateColumns(item: Item) {
      this.$emit('bks-item-update-columns', item.entity)
    },
  },
})
</script>
