<template>
  <nav class="list-group flex-col">
    <div class="list-heading row">
      <div class="sub row flex-middle noselect">
        <div>Pinned <span class="badge">{{orderedPins.length}}</span></div>
      </div>
      <div class="row">
        <div class="actions">
          <sidebar-sort-buttons v-model="sort" :sortOptions="sortOptions" noOrder='position' />
        </div>

      </div>
    </div>
    <Draggable :options="{handle: '.drag-handle'}" v-model="orderedPins" tag="div" ref="pinContainer" class="list-body">
      <div class="pin-wrapper" v-for="p in orderedPins" :key="p.id || p.entity.name">
        <table-list-item
          v-if="p.entityType !== 'routine'"
          :table="p.entity"
          :pinned="true"
          :connection="connection"
          :draggable="sort.field === 'position'"
          :container="$refs.pinContainer"
          :forceExpand="allExpanded"
          :forceCollapse="allCollapsed"
          @selected="refreshColumns"
          :noSelect="true"
          @contextmenu.prevent.stop="$bks.openMenu({item: p.entity, event: $event, options: tableMenuOptions})"

        />
        <routine-list-item
          v-else
          :container="$refs.pinContainer"
          :draggable="sort.field === 'position'"
          :routine="p.entity"
          :connection="connection"
          :pinned="true"
          :forceExpand="allExpanded"
          :forceCollapse="allCollapsed"
          @contextmenu.prevent.stop="$bks.openMenu({item: p.entity, event: $event, options: routineMenuOptions})"

        />

      </div>


    </Draggable>
  </nav>
</template>
<script lang="ts">
import _ from 'lodash'
import Draggable from 'vuedraggable'
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'
import RoutineListItem from '@/components/sidebar/core/table_list/RoutineListItem.vue'
import TableListItem from '@/components/sidebar/core/table_list/TableListItem.vue'
import Vue from 'vue'
import TableListContextMenus from '@/mixins/TableListContextMenus'
import SidebarSortButtons from '@/components/common/SidebarSortButtons.vue'
export default Vue.extend({
  components: { RoutineListItem, Draggable, TableListItem, SidebarSortButtons },
  mixins: [ TableListContextMenus],
  props: [
    'allExpanded', 'allCollapsed', 'connection'
  ],
  data: () => ({
    sort: { field: 'position', order: 'asc'},
    sortOptions: {
      position: 'Drag & Drop',
      entityName: 'Alphanumeric'
    }
  }),
  computed: {
    orderedPins: {
      get(): PinnedEntity[] {
        const raw: PinnedEntity[] = this.$store.getters['pins/orderedPins']
        let result = _.sortBy(raw, this.sort.field)
        if (this.sort.order === 'desc' && this.sort.field !== 'position') return result.reverse()
        return result;
      },
      set(pins: PinnedEntity[]) {
        this.$store.dispatch('pins/reorder', pins)
      }
    }
  },
  watch: {
    sort() {
      this.$settings.set('pinSortField', this.sort.field)
      this.$settings.set('pinSortOrder', this.sort.order)
    }
  },
  async mounted() {
    const [ field, order ] = await Promise.all([
      this.$settings.get('pinSortField', 'position'),
      this.$settings.get('pinSortOrder', 'asc')
    ])
    this.sort = { field, order }
  },
  methods: {
    refreshColumns(table) {
      this.$store.dispatch('updateTableColumns', table)
    },
  }

})
</script>
