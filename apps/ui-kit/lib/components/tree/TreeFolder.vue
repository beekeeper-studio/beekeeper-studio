<template>
  <component :is="tag" class="BksTree-folder" type="button">
    <i class="material-icons expand-icon" :class="{ expanded }">
      keyboard_arrow_right
    </i>
    <i class="material-icons folder-icon">folder</i>
    <span class="name">{{ node.name }} ({{ count }})</span>
  </component>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { FolderNode, ItemNode } from "./types";

export default Vue.extend({
  name: "TreeFolder",

  props: {
    node: {
      type: Object as PropType<FolderNode>,
      required: true,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
    descendantsMap: {
      type: Map,
      required: true,
    },
    allItems: {
      type: Array as PropType<ItemNode[]>,
      required: true,
    },
    tag: {
      type: String,
      default: "button",
    },
  },

  computed: {
    count(): number {
      const descendants = this.descendantsMap.get(this.node.id);
      if (!descendants) {
        return 0;
      }
      const allItems: ItemNode[] = this.allItems;
      return allItems.filter((item) => {
        if (item.parentId === null) {
          return false;
        }
        return item.parentId === this.node.id || descendants.has(item.parentId);
      }).length;
    },
  },
});
</script>

<style scoped lang="scss">
.BksTree-folder {
  display: flex;
  align-items: center;
  border: none;
  background-color: transparent;
  padding: 0;
  width: 100%;
  border-radius: 4px;
  cursor: pointer;
  color: rgb(from var(--bks-theme-base) r g b / 77%);
  font-size: 1rem;
  height: 1.75rem;
  padding-left: calc(var(--depth) * 1rem);

  &:hover {
    background-color: rgb(from var(--bks-theme-base) r g b / 3.5%);

    .expand-icon {
      color: var(--bks-text-dark);
    }
  }
}

.name {
  margin-left: 0.5rem;
}

.material-icons.folder-icon {
  color: var(--bks-text-lighter);
  font-size: 1rem;
  margin-left: 0.25rem;
}

.material-icons.expand-icon {
  color: var(--bks-text-lighter);
  font-size: 1.25rem;

  &.expanded {
    transform: rotate(90deg);
  }
}
</style>
