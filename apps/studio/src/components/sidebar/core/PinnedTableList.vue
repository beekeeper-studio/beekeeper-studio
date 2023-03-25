<template>
  <nav class="list-group flex-col">
    <div class="list-heading row">
      <div class="sub row flex-middle expand">
        <div>Pinned <span class="badge">{{ orderedPins.length }}</span></div>
      </div>
        <div class="row">
          <div class="actions">
            <a  @click.prevent="sortOrder(pinnSortOrder === 'asc' ? 'desc' : 'asc')"  :title="pinnSortOrder === 'asc' ? 'Ascending' : 'Descending'">
              <i class="material-icons">
               {{ pinnSortOrder === 'asc' ? "expand_less" : "expand_more" }}
              </i>
               </a>
          </div>
          <div>
            <a  
              @click.prevent="sortBy(pinnSortBy === 'entityName' ? 'position' : 'entityName')" 
              :title="pinnSortBy === 'entityName' ? 'Alphabetically' : 'By position'" class="create-table">
              <i class="material-icons">
                {{ pinnSortBy === 'entityName' ? "sort_by_alpha" : 'sort' }}
              </i>
            </a>
          </div>
        </div>
    </div>
    <Draggable
      :options="{handle: '.drag-handle'}"
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
          :connection="connection"
          :draggable="true"
          :container="$refs.pinContainer"
          :force-expand="allExpanded"
          :force-collapse="allCollapsed"
          @selected="refreshColumns"
          :no-select="true"
          @contextmenu.prevent.stop="$bks.openMenu({item: p.entity, event: $event, options: tableMenuOptions})"
        />
        <routine-list-item
          v-else
          :container="$refs.pinContainer"
          :draggable="true"
          :routine="p.entity"
          :connection="connection"
          :pinned="true"
          :force-expand="allExpanded"
          :force-collapse="allCollapsed"
          @contextmenu.prevent.stop="$bks.openMenu({item: p.entity, event: $event, options: routineMenuOptions})"
        />
      </div>
    </Draggable>
  </nav>
</template>
<script lang="ts">
import Draggable from 'vuedraggable'
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'
import RoutineListItem from '@/components/sidebar/core/table_list/RoutineListItem.vue'
import TableListItem from '@/components/sidebar/core/table_list/TableListItem.vue'
import Vue from 'vue'
import TableListContextMenus from '@/mixins/TableListContextMenus'
export default Vue.extend({
  components: { RoutineListItem, Draggable, TableListItem },
  mixins: [ TableListContextMenus],
  props: [
    'allExpanded', 'allCollapsed', 'connection'
  ],
  computed: {
    pinnSortBy() {
      return this.$store.getters['pins/pinnSortBy']
    },
    pinnSortOrder() {
      return this.$store.getters['pins/pinnSortOrder']
    },
    orderedPins: {
      get(): PinnedEntity[] {
        return this.$store.getters['pins/orderedPins']
      },
      set(pins: PinnedEntity[]) {
        this.$store.dispatch('pins/reorder', pins)
      }
    }
  },
  methods: {
    refreshColumns(table) {
      this.$store.dispatch('updateTableColumns', table)
    },
    sortBy(sortBy: 'position' | 'entityName')  {
      this.$store.commit('pins/setSortBy',sortBy)
    },
    sortOrder(sortOrder: 'asc' | 'desc')  {
      this.$store.commit('pins/setSortOrder',sortOrder)
    }
  }

})
</script>
