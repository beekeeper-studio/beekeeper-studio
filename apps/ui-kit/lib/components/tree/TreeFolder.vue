<template>
  <component
    :is="tag"
    class="BksTree-folder"
    type="button"
    :data-expanded="expanded"
  >
    <i class="material-icons expand-icon">
      {{ expanded ? "keyboard_arrow_down" : "keyboard_arrow_right" }}
    </i>
    <i class="material-icons folder-icon">folder</i>
    <span class="name">
      <slot name="name">{{ node.name }}</slot>
    </span>
  </component>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { FolderNode } from "./types";

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
    tag: {
      type: String,
      default: "button",
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
  padding-right: 0.8rem;

  &:hover {
    background-color: rgb(from var(--bks-theme-base) r g b / 3.5%);

    .expand-icon {
      color: var(--bks-text-dark);
    }
  }
}

.name {
  margin-left: 0.5rem;
  flex-grow: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.material-icons.folder-icon {
  color: var(--bks-text-lighter);
  font-size: 1rem;
  margin-left: 0.25rem;
}

.material-icons.expand-icon {
  color: var(--bks-text-lighter);
  font-size: 1.25rem;
}
</style>
