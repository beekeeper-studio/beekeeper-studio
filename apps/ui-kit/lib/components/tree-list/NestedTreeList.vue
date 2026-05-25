<template>
  <draggable
    tag="ul"
    :class="['BksTreeList', { BksUiKit: isRoot }]"
    :list="list"
    :animation="0"
    draggable='[data-item-type="item"]'
    ghost-class="drag-ghost"
    group="BksTreeList"
    :move="canDropTarget"
    @change="$emit('bks-item-change', { event: $event, parent: null })"
    @start="onDragStart"
    @end="onDragEnd"
  >
    <li
      v-for="item in list"
      :key="item.id"
      class="tree-node"
      :data-item-type="item.type"
      :data-item-id="item.id"
    >
      <template v-if="item.type === 'folder'">
        <div
          class="folder-header"
          :class="{ 'drag-over': treeState.hover.folderId === item.id }"
          @click="toggle(item)"
          @dragenter.prevent
          @dragover.prevent="onFolderDragOver(item)"
          @dragleave="onFolderDragLeave(item, $event)"
          @drop.prevent="onFolderDrop(item)"
        >
          <slot name="folder" :item="item" :expanded="isExpanded(item)">
            <div
              class="folder-group schema"
              @contextmenu.stop.prevent="
                $emit('bks-folder-contextmenu', { event: $event, item })
              "
            >
              <a
                class="folder-btn"
                :class="{ open: isExpanded(item) }"
                role="button"
              >
                <span class="btn-fab open-close">
                  <i class="dropdown-icon material-icons">
                    keyboard_arrow_right
                  </i>
                </span>
                <i class="schema-icon item-icon material-icons">folder</i>
                <span class="table-name truncate expand" :title="item.name">
                  {{ item.name }}
                  <template v-if="item.count !== undefined">
                    ({{ item.count }})
                  </template>
                </span>
              </a>
            </div>
          </slot>
        </div>
        <NestedTreeList
          v-show="isExpanded(item)"
          class="folder-children"
          :list="item.children"
          @bks-item-change="
            (payload) =>
              $emit('bks-item-change', {
                event: payload.event,
                parent: payload.parent || item,
              })
          "
          @bks-item-click="$emit('bks-item-click', $event)"
          @bks-folder-toggle="$emit('bks-folder-toggle', $event)"
          @bks-folder-drop="$emit('bks-folder-drop', $event)"
          @bks-folder-contextmenu="$emit('bks-folder-contextmenu', $event)"
        >
          <template v-if="$scopedSlots.folder" #folder="slotProps">
            <slot name="folder" v-bind="slotProps" />
          </template>
          <template v-if="$scopedSlots.item" #item="slotProps">
            <slot name="item" v-bind="slotProps" />
          </template>
        </NestedTreeList>
      </template>
      <div v-else class="item" @click="$emit('bks-item-click', { item })">
        <slot name="item" :item="item">{{ item.name }}</slot>
      </div>
    </li>
  </draggable>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import Draggable from "vuedraggable";
import { TreeItem, TreeState } from "./types";

export default Vue.extend({
  name: "NestedTreeList",
  components: { Draggable },
  inject: ["treeState"],
  props: {
    list: {
      type: Array as PropType<TreeItem[]>,
      default: () => [],
    },
    isRoot: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    isExpanded(item: TreeItem): boolean {
      const treeState = this.treeState as TreeState;
      return !!treeState.expanded[String(item.id)];
    },
    toggle(item: TreeItem) {
      const treeState = this.treeState as TreeState;
      const key = String(item.id);
      const expanded = !treeState.expanded[key];
      this.$set(treeState.expanded, key, expanded);
      this.$emit("bks-folder-toggle", { folder: item, expanded });
    },
    canDropTarget(): boolean {
      const treeState = this.treeState as TreeState;
      // Block list drops while hovering a folder header; the folder-drop
      // handler takes over in that case.
      return treeState.hover.folderId === null;
    },
    onFolderDragOver(item: TreeItem) {
      const treeState = this.treeState as TreeState;
      treeState.hover.folderId = item.id;
    },
    onFolderDragLeave(item: TreeItem, event: DragEvent) {
      const treeState = this.treeState as TreeState;
      const currentTarget = event.currentTarget as Element | null;
      const relatedTarget = event.relatedTarget as Node | null;
      if (
        currentTarget &&
        relatedTarget &&
        currentTarget.contains(relatedTarget)
      ) {
        return;
      }
      if (treeState.hover.folderId === item.id) {
        treeState.hover.folderId = null;
      }
    },
    onDragStart(event: any) {
      const treeState = this.treeState as TreeState;
      treeState.hover.draggedNode = this.list[event.oldIndex] ?? null;
    },
    onDragEnd() {
      const treeState = this.treeState as TreeState;
      treeState.hover.draggedNode = null;
      treeState.hover.folderId = null;
    },
    onFolderDrop(item: TreeItem) {
      const treeState = this.treeState as TreeState;
      const draggedNode = treeState.hover.draggedNode;
      treeState.hover.folderId = null;
      if (!draggedNode || draggedNode.id === item.id) {
        return;
      }
      this.$emit("bks-folder-drop", { folder: item, draggedNode });
    },
  },
});
</script>

<style scoped>
.BksTreeList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.folder-header {
  cursor: pointer;
  user-select: none;
}

.drag-ghost {
  opacity: 0.4;
}

.drag-pending {
  opacity: 0.5;
}

.folder-children {
  position: relative;
  padding-left: 0.8rem;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 9px;
    border-left: 1px solid rgb(from var(--theme-base) r g b / 8%);
  }
}

.folder-header.drag-over ::v-deep .folder-btn {
  background-color: rgba(128, 128, 128, 0.2);
  outline: 1px solid rgba(128, 128, 128, 0.4);
  outline-offset: -1px;
}
</style>
