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
        <bks-table-list
          :tables="tables"
          :context-menu-items="handleContextMenuItems"
          :hidden-entities="hiddenEntities"
          @bks-entity-dblclick="handleEntityDblclick"
          @bks-entity-unhide="handleEntityUnhide"
          @bks-entities-request-columns="handleEntitiesRequestColumns"
          @bks-refresh-click="handleRefreshClick"
          @bks-add-entity-click="handleAddEntityClick"
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
  import BksTableList from "@bks/ui-kit/vue/table-list";
  import TableListContextMenusMixin from "@/mixins/TableListContextMenus";

  import { mapState, mapGetters } from 'vuex'
  import rawLog from '@bksLogger'

  const log = rawLog.scope('core-sidebar')

  export default {
    mixins: [TableListContextMenusMixin],
    props: ['sidebarShown'],
    components: { BksTableList, DatabaseDropdown, HistoryList, GlobalSidebar, FavoriteList},
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
      tables() {
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
    }
  }
</script>
