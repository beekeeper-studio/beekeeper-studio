<template>
  <nav class="list-group flex-col">
    <div class="list-heading">
      <span class="sub">Pinned</span>
      <span class="badge">{{ orderedPins.length }}</span>
      <div class="actions">
        <sidebar-sort-buttons
          v-if="initialized"
          v-model="sort"
          :sort-options="sortOptions"
          no-order="position"
        />
      </div>
    </div>
    <Draggable
      :options="{ handle: '.drag-handle' }"
      v-model="orderedPins"
      tag="div"
      ref="pinContainer"
      class="list-body"
    >
      <div
        class="pin-wrapper"
        v-for="p in orderedPins"
        :key="p.id || p.entity.name"
      >
        <table-list-item
          v-if="p.entityType !== 'routine'"
          :table="p.entity"
          :pinned="true"
          :draggable="sort.field === 'position'"
          :container="$refs.pinContainer"
          :force-expand="allExpanded"
          :force-collapse="allCollapsed"
          @selected="refreshColumns"
          :no-select="true"
          @contextmenu.prevent.stop="$bks.openMenu({ item: p.entity, event: $event, options: tableMenuOptions })"
        />
        <routine-list-item
          v-else
          :container="$refs.pinContainer"
          :draggable="sort.field === 'position'"
          :routine="p.entity"
          :pinned="true"
          :force-expand="allExpanded"
          :force-collapse="allCollapsed"
          @contextmenu.prevent.stop="$bks.openMenu({ item: p.entity, event: $event, options: routineMenuOptions })"
        />
      </div>
    </Draggable>
  </nav>
</template>
<script lang="ts">
import _ from 'lodash'
import Draggable from 'vuedraggable'
import RoutineListItem from '@/components/sidebar/core/table_list/RoutineListItem.vue'
import TableListItem from '@/components/sidebar/core/table_list/TableListItem.vue'
import Vue from 'vue'
import TableListContextMenus from '@/mixins/TableListContextMenus'
import SidebarSortButtons from '@/components/common/SidebarSortButtons.vue'
import { TransportPinnedEntity } from '@/common/transport/TransportPinnedEntity'

export default Vue.extend({
  components: { RoutineListItem, Draggable, TableListItem, SidebarSortButtons },
  mixins: [TableListContextMenus],
  props: [
    'allExpanded', 'allCollapsed'
  ],
  data: () => ({
    sort: { field: 'position', order: 'asc' },
    sortOptions: {
      position: 'Drag & Drop',
      entityName: 'Alphanumeric'
    },
    initialized: false,
  }),
  computed: {
    orderedPins: {
      get(): TransportPinnedEntity[] {
        const raw: TransportPinnedEntity[] = this.$store.getters['pins/orderedPins']
        let result = _.sortBy(raw, this.sort.field)
        if (this.sort.order === 'desc' && this.sort.field !== 'position') return result.reverse()
        return result;
      },
      set(pins: TransportPinnedEntity[]) {
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
    const [field, order] = await Promise.all([
      this.$settings.get('pinSortField', 'position'),
      this.$settings.get('pinSortOrder', 'asc')
    ])
    this.sort = { field, order }
    this.initialized = true
  },
  methods: {
    refreshColumns(table) {
      this.$store.dispatch('updateTableColumns', table)
    },
  }

})
</script>
