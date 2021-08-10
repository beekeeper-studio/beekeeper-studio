<template>
  <nav class="list-group flex-col">
    <div class="list-heading row">
      <div class="sub row flex-middle expand">
        <div>Pinned <span class="badge">{{orderedPins.length}}</span></div>
      </div>
    </div>
    <Draggable :options="{handle: '.pin-wrapper'}" v-model="orderedPins" tag="div" ref="pinContainer" class="list-body">
      <div class="pin-wrapper" v-for="p in orderedPins" :key="p.id || p.entity.name">
        <table-list-item
          v-if="p.entityType !== 'routine'"
          :table="p.entity"
          :pinned="true"
          :connection="connection"
          :container="$refs.pinContainer"
          :forceExpand="allExpanded"
          :forceCollapse="allCollapsed"
          :noSelect="true"
          @contextmenu.prevent.stop="openTableMenu($event, p.entity)"

        />
        <routine-list-item
          v-else
          :container="$refs.pinContainer"
          :routine="p.entity"
          :connection="connection"
          :pinned="true"
          :forceExpand="forceExpand"
          :forceCollapse="forceCollapse"
          @contextmenu.prevent.stop="openRoutineMenu($event, p.entity)"

        />
        
      </div>
  

    </Draggable>
      <context-menu
        elementId="pinned-tables-context-menu"
        :options="tableMenuOptions"
        ref="tableMenu"
        @option-clicked="tableMenuClick"
        :triggerEvent="tableEvent"
      />
      <context-menu
        elementId="pinned-routines-context-menu"
        :options="routineMenuOptions"
        ref="routineMenu"
        @option-clicked="routineMenuClick"
        :triggerEvent="routineEvent"
      />
  </nav>
</template>
<script lang="ts">
import Draggable from 'vuedraggable'
import { PinnedEntity } from '@/common/appdb/models/PinnedEntity'
import RoutineListItem from '@/components/sidebar/core/table_list/RoutineListItem.vue'
import TableListItem from '@/components/sidebar/core/table_list/TableListItem.vue'
import ContextMenu from '@/components/common/ContextMenu.vue'
import Vue from 'vue'
import TableListContextMenus from '@/mixins/TableListContextMenus'
export default Vue.extend({
  components: { RoutineListItem, Draggable, TableListItem, ContextMenu },
  mixins: [ TableListContextMenus],
  props: [
    'allExpanded', 'allCollapsed', 'connection'
  ],
  computed: {
    orderedPins: {
      get(): PinnedEntity[] {
        return this.$store.getters['pins/orderedPins']
      },
      set(pins: PinnedEntity[]) {
        this.$store.dispatch('pins/reorder', pins)
      }
    }
  }
  
})
</script>