<template>
  <NestedTreeList :list="list" :is-root="true" v-on="$listeners">
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
  watch: {
    list(newList: TreeItem[]) {
      this.seed(newList);
    },
  },
  methods: {
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
