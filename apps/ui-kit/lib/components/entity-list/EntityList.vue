<template>
  <div
    class="BksUiKit BksEntityList"
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
        <div class="filter-actions">
          <button
            class="btn btn-fab btn-link action-item"
            @click="clearFilter"
            v-if="filterQuery"
          >
            <i class="clear material-icons">cancel</i>
          </button>

          <button
            :title="entitiesHidden ? 'Filter active' : 'No filters'"
            class="btn btn-fab btn-link action-item"
            :class="{active: entitiesHidden}"
            @click="openFilterMenu"
            menu
          >
            <i class="material-icons-outlined">filter_alt</i>
          </button>
        </div>
      </div>
    </div>

    <x-progressbar
      v-show="tablesLoading"
      style="margin-top: -5px;"
    />

    <pinned-table-list
      v-show="pinnedEntities.length > 0"
      :entities="pinnedEntities"
      :sort-by="pinnedSortBy"
      :sort-order="pinnedSortOrder"
      @request-entities-columns="handleRequestEntitiesColumns"
      @sort-by="handlePinSortBy"
      @sort-order="handlePinSortOrder"
      @sort-position="handlePinSortPosition"
      @pin="handlePin"
      ref="pinned"
    />

    <!-- Tables -->
    <hr v-show="pinnedEntities.length > 0"> <!-- Fake splitjs Gutter styling -->

    <nav
      class="main-entity-list list-group flex-col"
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
          v-show="hiddenEntities.length > 0 && !filterQuery"
          class="hidden-indicator bks-tooltip-wrapper"
        >
          <span class="badge">
            <i class="material-icons">visibility_off</i>
            <span>{{ hiddenEntities.length > 99 ? '99+' : hiddenEntities.length }}</span>
          </span>
          <div class="hi-tooltip bks-tooltip bks-tooltip-bottom-center">
            <span>Right click an entity to hide it. </span>
            <a @click="openHiddenEntitiesModal = true">View hidden</a><span>.</span>
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
            @click.prevent="$emit('bks-refresh-btn-click', { event: $event })"
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
            v-if="showCreateEntityBtn"
          >
            <i class="material-icons">add</i>
          </button>
        </div>
      </div>

      <virtual-table-list
        :entities="filteredEntities"
        :hidden-entities="hiddenEntities"
        :pinned-entities="pinnedEntities"
        :enable-pinning="enablePinning"
        :expand-all="expandAll"
        :collapse-all="collapseAll"
        @expand="handleExpand"
        @expand-all="handleExpandAll"
        @pin="handlePin"
        @dblclick="handleDblClick"
        @contextmenu="handleContextMenu"
        @request-items-columns="handleRequestItemsColumns"
      />

      <!-- TODO (gregory): Make the 'no tables div nicer' -->
      <div
        class="empty truncate"
        v-if="!tablesLoading && emptyEntities"
      >
        <p class="no-entities">
          There are no entities
        </p>
      </div>
    </nav>
    <hidden-entities-modal
      v-if="openHiddenEntitiesModal"
      :hidden-entities="hiddenEntities"
      @unhide-entity="$emit('bks-entity-unhide', { entity: $event })"
      @close="openHiddenEntitiesModal = false"
    />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import _ from 'lodash'
import VirtualTableList from './VirtualTableList.vue'
import { entityFilter } from './sql_tools'
import { Item, SortByValues } from "./models";
import { Entity } from "../types";
import { writeClipboard } from "../../utils/clipboard";
import { openMenu, CustomMenuItems, useCustomMenuItems } from "../context-menu/menu";
import ProxyEmit from "../mixins/ProxyEmit";
import HiddenEntitiesModal from "./HiddenEntitiesModal.vue";
import PinnedTableList from "./PinnedTableList.vue";
import Split from "split.js";

export default Vue.extend({
  mixins: [ProxyEmit],
  components: { VirtualTableList, HiddenEntitiesModal, PinnedTableList },
  props: {
    entities: {
      type: Array as PropType<Entity[]>,
      default: () => [],
    },
    /** This should reference the same entities as `tables`. */
    hiddenEntities: {
      type: Array as PropType<Entity[]>,
      default: () => [],
    },
    /** This should reference the same entities as `tables`. */
    pinnedEntities: {
      type: Array as PropType<Entity[]>,
      default: () => [],
    },
    enablePinning: {
      type: Boolean,
      default: false,
    },
    pinnedSortBy: {
      type: String as PropType<typeof SortByValues[number]>,
      default: "position",
    },
    pinnedSortOrder: {
      type: String,
      default: "asc",
    },
    contextMenuItems: [Array, Function] as PropType<CustomMenuItems>,
    showCreateEntityBtn: {
      type: Boolean,
      default: true,
    },
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
      },
      tablesLoading: false,
      openHiddenEntitiesModal: false,
      expandAll: 0,
      collapseAll: 0,
      split: null,
    }
  },
  computed: {
    emptyEntities() {
      return !this.entities || this.entities.length === 0
    },
    createDisabled() {
      // FIXME
      return false
      // return !!this.dialectData.disabledFeatures.createTable
    },
    totalEntities() {
      return this.entities.length - this.hiddenEntities.length
    },
    shownEntities() {
      return this.filteredEntities.length
    },
    totalFilteredEntities() {
      return this.totalEntities - this.shownEntities
    },
    entitiesHidden() {
      return !this.showTables || !this.showViews || !this.showRoutines
    },
    filteredEntities() {
      return entityFilter(this.entities, this.entityFilter);
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
    // ...mapState(['selectedSidebarItem', 'tables', 'routines', 'database', 'tablesLoading', 'supportedFeatures']),
    // ...mapGetters(['dialectData']),
    tableMenuOptions() {
      return [
        {
          label: "Copy Name",
          id: 'copy-name',
          handler({ item }) {
            writeClipboard(item.name)
          },
        },
      ]
    },
    filterMenuOptions() {
      return [
        {
          label: "Tables",
          id: 'tables',
          checked: this.showTables,
          keepOpen: true,
          handler: ({ checked }) => {
            this.showTables = checked
          },
        },
        {
          label: "Views",
          id: 'views',
          checked: this.showViews,
          keepOpen: true,
          handler: ({ checked }) => {
            this.showViews = checked
          },
        },
        {
          label: "Routines",
          id: 'routines',
          checked: this.showRoutines,
          keepOpen: true,
          handler: ({ checked }) => {
            this.showRoutines = checked
          },
        },
      ]
    },
  },
  methods: {
    clearFilter() {
      this.filterQuery = null
    },
    toggleExpandCollapse() {
      this.isExpanded = !this.isExpanded
      if (this.isExpanded) {
        this.expandAll++
      } else {
        this.collapseAll++
      }
    },
    newTable(event: MouseEvent) {
      this.$emit('bks-add-entity-click', { event })
    },
    async handleExpand(item: Item) {
      if (item.expanded) {
        this.$emit('bks-entity-expand', { entity: item.entity })
      } else {
        this.$emit('bks-entity-collapse', { entity: item.entity })
      }
    },
    handleExpandAll(expand: boolean) {
      if (expand) {
        this.$emit('bks-expand-all')
      } else {
        this.$emit('bks-collapse-all')
      }
    },
    handlePin(entity: Entity) {
      if (this.pinnedEntities.includes(entity)) {
        this.$emit('bks-entity-unpin', { entity })
      } else {
        this.$emit('bks-entity-pin', { entity })
      }
    },
    handleDblClick(event: MouseEvent, item: Item) {
      this.$emit('bks-entity-dblclick', { event, entity: item.entity })
    },
    handleContextMenu(event: MouseEvent, item: Item) {
      this.$emit('bks-entity-contextmenu', { event, entity: item.entity })
      const items = useCustomMenuItems(event, item.entity, this.tableMenuOptions, this.contextMenuItems)
      openMenu({ options: items, item: item.entity, event })
    },
    handleRequestItemsColumns(items: Item[]) {
      this.$emit('bks-entities-request-columns', { entities: items.map(item => item.entity) })
    },
    handleRequestEntitiesColumns(entities: Entity[]) {
      this.$emit('bks-entities-request-columns', { entities })
    },
    handlePinSortBy(sortBy: typeof SortByValues[number]) {
      this.$emit("bks-pinned-entities-sort-by", { sortBy })
    },
    handlePinSortOrder() {
      this.$emit("bks-pinned-entities-sort-order")
    },
    handlePinSortPosition(entities: Entity[]) {
      this.$emit("bks-pinned-entities-sort-position", { entities })
    },
    openFilterMenu(event: MouseEvent) {
      openMenu({ event, options: this.filterMenuOptions })
    },
  },
  mounted() {
    const components = [this.$refs.pinned.$el, this.$refs.tables]
    this.split = Split(components, {
      elementStyle: (_dimension, size) => ({
        'flex-basis': `calc(${size}%)`,
      }),
      direction: 'vertical',
      sizes: this.sizes,
    })
  },
})
</script>
