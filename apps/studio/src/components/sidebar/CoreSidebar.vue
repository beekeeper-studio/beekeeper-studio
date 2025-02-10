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
          @bks-item-dblclick="handleTableListItemDblClick"
          @bks-item-update-columns="handleItemUpdateColumns"
          @bks-refresh-btn-click="handleRefreshBtnClick"
          @bks-add-btn-click="handleAddBtnClick"
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

  import { mapState, mapGetters } from 'vuex'
  import rawLog from '@bksLogger'

  const log = rawLog.scope('core-sidebar')

  export default {
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
          tables.forEach((table) => {
            entities.push({
              entityType: table.entityType,
              name: table.name,
              schema: table.schema,
              columns: table.columns?.map((column) => ({
                field: column.columnName,
                dataType: column.dataType,
              }))
            })
          })
          routines.forEach((routine) => {
            entities.push({
              entityType: 'routine',
              name: routine.name,
              schema: routine.schema,
              returnType: routine.returnType,
              returnTypeLength: routine.returnTypeLength,
              routineParams: routine.routineParams,
            })
          })
        })
        return entities
      },
      ...mapState(['database']),
      ...mapGetters(['minimalMode']),
    },
    watch: {
      minimalMode() {
        if (this.minimalMode) {
          this.activeItem = 'tables'
        }
      },
    },
    methods: {
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
      handleTableListItemDblClick(table) {
        this.throttledLoadTable(table)
      },
      throttledLoadTable: _.throttle(function(table) {
        this.$root.$emit(AppEvent.loadTable, { table })
      }, 500),
      async handleItemUpdateColumns(table) {
        if (!table.columns?.length) {
          await this.$store.dispatch("updateTableColumns", table)
        }
      },
      async handleRefreshBtnClick() {
        try {
          this.$store.dispatch('updateRoutines')
          await this.$store.dispatch('updateTables')
        } catch (ex) {
          this.$noty.error(`Unable to refresh tables ${ex.message}`)
        }
      },
      async handleAddBtnClick() {
        this.$root.$emit(AppEvent.createTable)
      },
    }
  }
</script>
