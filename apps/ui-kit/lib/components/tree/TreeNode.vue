<template>
  <div class="BksTree-node">
    <div
      class="BksTree-row"
      draggable="true"
      :style="{ '--depth': depth }"
      :data-node-type="node.type"
      :data-drop-target="dropTargetPosition()"
      @click="handleClick"
      @dragstart="handleDragStart"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @dragend="$emit('node-dragend')"
    >
      <slot
        v-if="node.type === 'folder'"
        name="folder"
        :props="{ node, expanded, descendantsMap, allItems }"
      >
        <tree-folder
          :node="node"
          :expanded="expanded"
          :descendants-map="descendantsMap"
          :all-items="allItems"
        />
      </slot>
      <slot v-else name="item" :node="node" :depth="depth">
        {{ node.ref["name"] ?? node.ref.id }}
      </slot>
    </div>

    <template v-if="node.type === 'folder' && expanded">
      <div v-if="empty" class="BksTree-empty" :style="{ '--depth': depth + 1 }">
        No items
      </div>
      <tree-node
        v-for="child of childNodes"
        :key="`${child.type}-${child.id}`"
        :node="child"
        :all-items="allItems"
        :descendants-map="descendantsMap"
        :depth="depth + 1"
        :internal-id="internalId"
        :expanded-folder-ids="expandedFolderIds"
        :drop-target="dropTarget"
        :can-drop="canDrop"
        @toggle-expanded="$emit('toggle-expanded', $event)"
        @node-dragstart="$emit('node-dragstart', $event)"
        @node-dragover="$emit('node-dragover', $event)"
        @node-dragleave="$emit('node-dragleave', $event)"
        @node-drop="$emit('node-drop', $event)"
        @node-dragend="$emit('node-dragend')"
      >
        <template v-slot:folder="slotProps">
          <slot name="folder" v-bind="slotProps" />
        </template>
        <template v-slot:item="slotProps">
          <slot name="item" v-bind="slotProps" />
        </template>
      </tree-node>
    </template>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import TreeFolder from "./TreeFolder.vue";
import { nodeKey } from "./tree";
import { DragNode, DropPosition, DropTarget, ItemNode, Node } from "./types";

export default Vue.extend({
  name: "TreeNode",

  components: { TreeFolder },

  props: {
    node: {
      type: Object as PropType<Node>,
      required: true,
    },
    allItems: {
      type: Array as PropType<ItemNode[]>,
      default: () => [],
    },
    descendantsMap: {
      type: Map as PropType<Map<number, Set<number>>>,
      default: () => new Map(),
    },
    expandedFolderIds: {
      type: Array as PropType<number[]>,
      required: true,
    },
    depth: {
      type: Number,
      default: 0,
    },
    internalId: {
      type: String as PropType<string>,
      required: true,
    },
    dropTarget: {
      type: Object as PropType<DropTarget | null>,
      default: null,
    },
    canDrop: {
      type: Function as PropType<(node: DragNode) => boolean>,
      required: true,
    },
  },

  computed: {
    childItemNodes(): ItemNode[] {
      if (this.node.type !== "folder") {
        return [];
      }
      const folderId = this.node.id;
      return this.allItems
        .filter((item) => item.parentId === folderId)
        .sort((a, b) => a.position - b.position);
    },

    childNodes(): Node[] {
      if (this.node.type !== "folder") {
        return [];
      }
      return [...this.node.children, ...this.childItemNodes];
    },

    empty(): boolean {
      return this.childNodes.length === 0;
    },

    expanded(): boolean {
      return (
        this.node.type === "folder" &&
        this.expandedFolderIds.includes(this.node.id)
      );
    },

    dragNode(): DragNode {
      return this.node;
    },

    /**
     * dragover can only read `dataTransfer.types`, not getData(), so the tree id
     * has to live in the mime type for cross-tree drags to be rejectable.
     */
    dragMimeType(): string {
      return `application/x-bks-tree-${this.internalId}`;
    },
  },

  methods: {
    handleClick() {
      if (this.node.type !== "folder") {
        return;
      }
      this.$emit("toggle-expanded", this.dragNode);
    },

    dropTargetPosition(): DropPosition | null {
      if (this.dropTarget?.key !== nodeKey(this.dragNode)) {
        return null;
      }
      return this.dropTarget.position;
    },

    zoneAt(event: DragEvent): DropPosition {
      // Folders have no position, so they can only be dropped into.
      if (this.dragNode.type === "folder") {
        return "inside";
      }
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const offset = (event.clientY - rect.top) / rect.height;
      return offset < 0.5 ? "before" : "after";
    },

    isOurDrag(event: DragEvent): boolean {
      return !!event.dataTransfer?.types.includes(this.dragMimeType);
    },

    handleDragStart(event: DragEvent) {
      const node = this.dragNode;
      // Firefox refuses to start a drag without setData. The value is never read.
      event.dataTransfer.setData(this.dragMimeType, String(node.ref.id));
      event.dataTransfer.effectAllowed = "move";
      this.$emit("node-dragstart", node);
    },

    handleDragOver(event: DragEvent) {
      const node = this.dragNode;
      if (!this.isOurDrag(event)) {
        return;
      }
      if (!this.canDrop(node)) {
        return;
      }
      this.$emit("node-dragover", { node, position: this.zoneAt(event) });
      // Skipping preventDefault on an invalid target is what gives us the
      // native no-drop cursor.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },

    handleDragLeave(event: DragEvent) {
      const row = event.currentTarget as HTMLElement;
      // dragleave also fires when the pointer crosses into a child of the row.
      if (row.contains(event.relatedTarget as HTMLElement | null)) {
        return;
      }
      this.$emit("node-dragleave", this.dragNode);
    },

    handleDrop(event: DragEvent) {
      if (!this.isOurDrag(event)) {
        return;
      }
      event.preventDefault();
      this.$emit("node-drop", this.dragNode);
    },
  },
});
</script>

<style scoped lang="scss">
.BksTree-node {
  position: relative;
}

.BksTree-empty {
  padding-block: 0.25rem;
  padding-left: calc(var(--depth) * 1rem + 1.3rem);
  color: var(--bks-text-lighter);
}

.BksTree-row {
  position: relative;
  user-select: none;

  &[data-drop-target="inside"] {
    background-color: rgb(from var(--bks-brand-primary) r g b / 15%);
    border-radius: 4px;
  }

  &[data-drop-target="before"]::before,
  &[data-drop-target="after"]::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--bks-brand-primary);
    pointer-events: none;
  }

  &[data-drop-target="before"]::before {
    top: 0;
  }

  &[data-drop-target="after"]::after {
    bottom: 0;
  }
}
</style>
