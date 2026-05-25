<template>
  <NestedTreeList
    :list="list"
    :is-root="true"
    v-on="innerListeners"
    @bks-item-change="onChange"
  >
    <template v-if="$scopedSlots.folder" #folder="slotProps">
      <slot name="folder" v-bind="slotProps" />
    </template>
    <template v-if="$scopedSlots.item" #item="slotProps">
      <slot name="item" v-bind="slotProps" />
    </template>
  </NestedTreeList>
</template>

<script lang="ts">
import Vue from "vue";
import NestedTreeList from "./NestedTreeList.vue";
import { TreeItem, TreeState } from "./types";
import { props } from "./tree-list";

export type { TreeItem } from "./types";

export default Vue.extend({
  name: "BksTreeList",
  components: { NestedTreeList },
  provide() {
    return {
      treeState: this.state,
    };
  },
  props,
  data() {
    const state: TreeState = {
      expanded: {},
      hover: { folderId: null, draggedNode: null },
    };
    return { state };
  },
  created() {
    this.seed(this.list);
  },
  computed: {
    innerListeners(): Record<string, unknown> {
      const listeners = { ...this.$listeners };
      delete listeners["bks-item-change"];
      return listeners;
    },
  },
  watch: {
    list(newList: TreeItem[]) {
      this.seed(newList);
    },
  },
  methods: {
    onChange({ event, parent }: { event: any; parent: TreeItem | null }) {
      let type: "added" | "moved";
      if (event.added) {
        type = "added";
      } else if (event.moved) {
        type = "moved";
      } else {
        return;
      }
      const { element, newIndex } = event[type];
      if (element.type !== "item") {
        return;
      }
      this.$emit("bks-item-change", {
        event: { type, element, newIndex },
        draggableEvent: event,
        siblings: parent ? parent.children : this.list,
        targetFolder: parent ? parent.folder : null,
      });
    },
    seed(items: TreeItem[]) {
      for (const item of items) {
        if (item.type !== "folder") {
          continue;
        }
        const key = String(item.id);
        if (!(key in this.state.expanded)) {
          this.$set(this.state.expanded, key, item.expanded ?? false);
        }
        if (item.children) {
          this.seed(item.children);
        }
      }
    },
  },
});
</script>
