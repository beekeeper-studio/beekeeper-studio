<template>
  <div class="sidebar-wrap row">
    <global-sidebar
      v-if="!minimalMode"
      @selected="click"
      v-on="$listeners"
      :active-item="activeItem"
    />

    <div class="tab-content">
      <!-- Tables -->
      <div
        class="tab-pane"
        id="tab-tables"
        :class="tabClasses('tables')"
        v-show="activeItem === 'tables'"
      >
        <database-dropdown
          @databaseSelected="databaseSelected"
        />
        <bks-entity-list
          :entities="entities"
          :context-menu-items="handleContextMenuItems"
          :hidden-entities="hiddenEntities"
          :pinned-entities="pinnedEntities"
          :pinned-sort-by="pinSortBy"
          :pinned-sort-order="pinSortOrder"
          enable-pinning
          @bks-entity-dblclick="handleEntityDblclick"
          @bks-entity-unhide="handleEntityUnhide"
          @bks-entity-pin="handleEntityPin"
          @bks-entities-request-columns="handleEntitiesRequestColumns"
          @bks-refresh-click="handleRefreshClick"
          @bks-add-entity-click="handleAddEntityClick"
          @bks-pinned-entities-sort-by="handlePinnedEntitiesSortBy"
          @bks-pinned-entities-sort-order="handlePinnedEntitiesSortOrder"
          @bks-pinned-entities-sort-position="handlePinnedEntitiesSortPosition"
        />
      </div>

      <!-- History -->
      <div
        class="tab-pane"
        id="tab-history"
        v-show="activeItem === 'history'"
        :class="tabClasses('history')"
      >
        <history-list />
      </div>

      <!-- Favorites -->
      <div
        class="tab-pane"
        id="tab-saved"
        :class="tabClasses('queries')"
        v-show="activeItem === 'queries'"
      >
        <favorite-list />
      </div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash'
  import GlobalSidebar from './GlobalSidebar.vue'
  import HistoryList from './core/HistoryList.vue'
  import FavoriteList from './core/FavoriteList.vue'
  import DatabaseDropdown from './core/DatabaseDropdown.vue'
  import { AppEvent } from "@/common/AppEvent";
  import BksEntityList from "@bks/ui-kit/vue/entity-list";
  import TableListContextMenusMixin from "@/mixins/TableListContextMenus";
  import { shallowEqual } from '@/common/utils'

  import { mapState, mapGetters } from 'vuex'
  import rawLog from '@bksLogger'

  const log = rawLog.scope('core-sidebar')

  export default {
    mixins: [TableListContextMenusMixin],
    props: ['sidebarShown'],
    components: { BksEntityList, DatabaseDropdown, HistoryList, GlobalSidebar, FavoriteList},
    data() {
      return {
        tableLoadError: null,
        selectedTable: null,
        filterQuery: null,
        allExpanded: null,
        allCollapsed: null,
        activeItem: 'tables',
        pinSortBy: 'position',
        pinSortOrder: 'asc',
      }
    },
    computed: {
      entities() {
        const entities = []
        this.$store.getters.schemaTables.forEach(({ tables, routines }) => {
          tables.forEach((table) => entities.push(table))
          routines.forEach((routine) => entities.push(routine))
        })
        return entities
      },
      ...mapState(['database']),
      ...mapGetters(['minimalMode']),
      ...mapGetters({
        pins: 'pins/pinned',
        pinnedEntities: 'pins/pinnedEntities',
        hiddenEntities: "hideEntities/databaseEntities",
      }),
    },
    watch: {
      minimalMode() {
        if (this.minimalMode) {
          this.activeItem = 'tables'
        }
      },
    },
    methods: {
      /** @param entity {import('@/lib/db/models').DatabaseEntity} */
      handleContextMenuItems(event, entity, defaultItems) {
        switch(entity.entityType) {
          case "table":
          case "view":
          case "materialized_view":
            return this.tableMenuOptions;
          case "routine":
            return this.routineMenuOptions;
          case "schema":
            return this.schemaMenuOptions;
          default:
            return defaultItems;
        }
      },
      tabClasses(item) {
        return {
          show: (this.activeItem === item),
          active: (this.activeItem === item)
        }
      },
      click(item) {
        this.activeItem = item;
        if(!this.sidebarShown) {
          this.$emit('toggleSidebar')
        }
      },
      async databaseSelected(db) {
        log.info("Pool database selected", db)
        this.$store.dispatch('changeDatabase', db).catch((e) => {
          this.$noty.error(e.message);
        })
        this.allExpanded = false
      },
      async disconnect() {
        await this.$store.dispatch('disconnect')
        this.$noty.success("Successfully Disconnected")
      },
      handleEntityDblclick(detail) {
        this.throttledLoadTable(detail.entity)
      },
      throttledLoadTable: _.throttle(function(table) {
        this.$root.$emit(AppEvent.loadTable, { table })
      }, 500),
      handleEntityUnhide(detail) {
        if (detail.entity.entityType === 'schema') {
          this.trigger(AppEvent.toggleHideSchema, detail.entity.name, false)
        } else {
          this.trigger(AppEvent.toggleHideEntity, detail.entity, false)
        }
      },
      handleEntityPin(detail) {
        this.$store.dispatch('pins/add', detail.entity)
        if (detail.entity.entityType === 'table' || detail.entity.entityType === 'view') {
          this.$store.dispatch('updateTableColumns', detail.entity)
        }
      },
      async handleEntitiesRequestColumns(detail) {
        // FIXME IMPORTANT this will produce a race condition
        detail.entities.forEach((table) => {
          this.$store.dispatch("updateTableColumns", table)
        })
      },
      async handleRefreshClick() {
        try {
          this.$store.dispatch('updateRoutines')
          await this.$store.dispatch('updateTables')
        } catch (ex) {
          this.$noty.error(`Unable to refresh tables ${ex.message}`)
        }
      },
      async handleAddEntityClick() {
        this.$root.$emit(AppEvent.createTable)
      },
      handlePinnedEntitiesSortBy(detail) {
        this.$settings.set('pinSortField', detail.sortBy === 'name' ? 'entityName' : detail.sortBy)
        this.pinSortBy = detail.sortBy
      },
      handlePinnedEntitiesSortOrder() {
        const sortOrder = this.pinSortOrder === 'asc' ? 'desc' : 'asc'
        this.pinSortOrder = sortOrder
        this.$settings.set('pinSortOrder', sortOrder)
      },
      handlePinnedEntitiesSortPosition(detail) {
        const reorderedPins = []
        detail.entities.forEach((entity) => {
          const pin = this.pins.find((p) => p.entity === entity)
          if (!pin) {
            console.warn("Pinned entity not found", entity)
            return
          }
          reorderedPins.push(pin)
        })
        this.$store.dispatch('pins/reorder', reorderedPins)
      },
    },
    async mounted() {
      const pinSortField = await this.$settings.get('pinSortField', 'position')
      const pinSortOrder = await this.$settings.get('pinSortOrder', 'asc')
      this.pinSortBy = pinSortField === 'entityName' ? 'name' : pinSortField
      this.pinSortOrder = pinSortOrder
    }
  }
</script>
