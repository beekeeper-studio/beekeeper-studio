<template>
  <stateless-sidebar-folder
    v-if="source.type === 'schema'"
    v-show="!source.hidden"
    :expanded="source.expanded"
    :schema="source.entity"
    @expand="onExpand($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
  <stateless-table-list-item
    v-else-if="source.type === 'table'"
    :id="source.key"
    :level="source.level"
    :expanded="source.expanded"
    :table="source.entity"
    :pinned="source.pinned"
    :loading-columns="source.loadingColumns"
    @expand="onExpand($event, source)"
    @pin="onPin($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
  <stateless-routine-list-item
    v-else-if="source.type === 'routine'"
    :level="source.level"
    :expanded="source.expanded"
    :routine="source.entity"
    :pinned="source.pinned"
    @expand="onExpand($event, source)"
    @pin="onPin($event, source)"
    @contextmenu.prevent.stop="
      $bks.openMenu({
        event: $event,
        item: source.entity,
        options: source.contextMenu,
      })
    "
  />
</template>

<script lang="ts">
import Vue from "vue";
import StatelessTableListItem from "./StatelessTableListItem.vue";
import StatelessRoutineListItem from "./StatelessRoutineListItem.vue";
import StatelessSidebarFolder from "@/components/common/StatelessSidebarFolder.vue";
export default Vue.extend({
  components: {
    StatelessTableListItem,
    StatelessRoutineListItem,
    StatelessSidebarFolder,
  },
  props: ["source", "onExpand", "onPin"],
});
</script>
