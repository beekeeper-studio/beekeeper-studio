<template>
  <div class="BksTree-node">
    <div
      class="BksTree-row"
      draggable="true"
      :style="{ '--depth': depth }"
      :data-node-type="node.type"
      :data-drop-target="dropTargetPosition()"
      @click="$emit('node-click', node)"
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
        :key="child.id"
        :node="child"
        :all-items="allItems"
        :descendants-map="descendantsMap"
        :depth="depth + 1"
        :internal-id="internalId"
        :expanded-folder-ids="expandedFolderIds"
        :drop-target="dropTarget"
        :can-drop="canDrop"
        @node-dragstart="$emit('node-dragstart', $event)"
        @node-dragover="$emit('node-dragover', $event)"
        @node-dragleave="$emit('node-dragleave', $event)"
        @node-drop="$emit('node-drop', $event)"
        @node-dragend="$emit('node-dragend')"
        @node-click="$emit('node-click', $event)"
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
import { zoneAt } from "./tree";
import { DropPosition, DropTarget, ItemNode, Node } from "./types";

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
      type: Function as PropType<(node: Node) => boolean>,
      required: true,
    },
  },

  computed: {
    childItemNodes(): ItemNode[] {
      if (this.node.type !== "folder") {
        return [];
      }
      const folderId = this.node.ref.id;
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
        this.expandedFolderIds.includes(this.node.ref.id)
      );
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
    dropTargetPosition(): DropPosition | null {
      if (this.dropTarget?.id !== this.node.id) {
        return null;
      }
      return this.dropTarget.position;
    },

    isOurDrag(event: DragEvent): boolean {
      return !!event.dataTransfer?.types.includes(this.dragMimeType);
    },

    handleDragStart(event: DragEvent) {
      // Firefox refuses to start a drag without setData. The value is never read.
      event.dataTransfer.setData(this.dragMimeType, this.node.id);
      event.dataTransfer.effectAllowed = "move";
      this.$emit("node-dragstart", this.node);
    },

    handleDragOver(event: DragEvent) {
      if (!this.isOurDrag(event)) {
        return;
      }
      if (!this.canDrop(this.node)) {
        return;
      }
      this.$emit("node-dragover", {
        node: this.node,
        position: zoneAt(this.node, event),
      });
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
      this.$emit("node-dragleave", this.node);
    },

    handleDrop(event: DragEvent) {
      if (!this.isOurDrag(event)) {
        return;
      }
      event.preventDefault();
      this.$emit("node-drop", this.node);
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
