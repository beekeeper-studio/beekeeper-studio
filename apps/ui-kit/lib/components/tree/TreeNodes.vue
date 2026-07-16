<template>
  <div class="BksTree-nodes">
    <div
      class="BksTree-node"
      v-for="node of nodes ?? []"
      :key="nodeKey(node)"
    >
      <div
        class="BksTree-row"
        draggable="true"
        :style="{ '--depth': depth }"
        :data-node-type="node.refType"
        :data-drop-target="dropTargetFor(node)"
        @dragstart="handleDragStart($event, node)"
        @dragover="handleDragOver($event, node)"
        @dragleave="handleDragLeave($event, node)"
        @drop="handleDrop($event, node)"
        @dragend="$emit('node-dragend')"
      >
        <button
          v-if="node.refType === 'folder'"
          class="folder"
          type="button"
          @click.prevent="toggleExpanded(node)"
          @contextmenu="handleFolderContextmenu($event, node)"
        >
          <i
            class="material-icons expand-icon"
            :class="{ expanded: expandedFolderIds.includes(node.id) }"
          >
            keyboard_arrow_right
          </i>
          <i class="material-icons folder-icon">folder</i>
          <span class="folder-name">
            {{ node.ref.name }} ({{ node.nodes?.length ?? 0 }})
          </span>
        </button>
        <slot v-else name="item" :node="node" :depth="depth">
          {{ node.ref["name"] ?? node.id }}
        </slot>
      </div>

      <tree-node
        v-if="node.refType === 'folder'"
        :nodes="expandedFolderIds.includes(node.id) ? node.nodes : []"
        :internal-id="internalId"
        :expanded-folder-ids="expandedFolderIds"
        :drop-target="dropTarget"
        :can-drop="canDrop"
        :depth="depth + 1"
        @toggle-expanded="toggleExpanded"
        @folder-contextmenu="$emit('folder-contextmenu', $event)"
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
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import {
  DropPosition,
  DropTarget,
  Node,
  TreeFolderContextmenuEvent,
  nodeKey,
} from "./types";

export default Vue.extend({
  name: "TreeNode",

  props: {
    nodes: {
      type: Array as PropType<Node[]>,
      required: true,
    },
    internalId: {
      type: String as PropType<string>,
      required: true,
    },
    expandedFolderIds: {
      type: Array as PropType<number[]>,
      required: true,
    },
    depth: {
      type: Number,
      default: 0,
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
    /**
     * dragover can only read `dataTransfer.types`, not getData(), so the tree id
     * has to live in the mime type for cross-tree drags to be rejectable.
     */
    dragMimeType(): string {
      return `application/x-bks-tree-${this.internalId}`;
    },
  },

  methods: {
    nodeKey,

    dropTargetFor(node: Node): DropPosition | null {
      if (this.dropTarget?.key !== nodeKey(node)) return null;
      return this.dropTarget.position;
    },

    zoneAt(event: DragEvent, node: Node): DropPosition {
      // Folders have no position, so they can only be dropped into.
      if (node.refType === "folder") return "inside";
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const offset = (event.clientY - rect.top) / rect.height;
      return offset < 0.5 ? "before" : "after";
    },

    isOurDrag(event: DragEvent): boolean {
      return !!event.dataTransfer?.types.includes(this.dragMimeType);
    },

    handleDragStart(event: DragEvent, node: Node) {
      // Firefox refuses to start a drag without setData. The value is never read.
      event.dataTransfer.setData(this.dragMimeType, String(node.id));
      event.dataTransfer.effectAllowed = "move";
      this.$emit("node-dragstart", node);
    },

    handleDragOver(event: DragEvent, node: Node) {
      if (!this.isOurDrag(event)) return;
      if (!this.canDrop(node)) return;
      this.$emit("node-dragover", { node, position: this.zoneAt(event, node) });
      // Skipping preventDefault on an invalid target is what gives us the
      // native no-drop cursor.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },

    handleDragLeave(event: DragEvent, node: Node) {
      const row = event.currentTarget as HTMLElement;
      // dragleave also fires when the pointer crosses into a child of the row.
      if (row.contains(event.relatedTarget as HTMLElement | null)) return;
      this.$emit("node-dragleave", node);
    },

    handleDrop(event: DragEvent, node: Node) {
      if (!this.isOurDrag(event)) return;
      event.preventDefault();
      this.$emit("node-drop", node);
    },

    handleFolderContextmenu(event: MouseEvent, node: Node) {
      const payload: TreeFolderContextmenuEvent = { event, node };
      this.$emit("folder-contextmenu", payload);
    },

    toggleExpanded(node: Node) {
      this.$emit("toggle-expanded", node);
    },
  },
});
</script>

<style scoped lang="scss">
.BksTree-node {
  position: relative;
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

.folder {
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

.folder-name {
  margin-left: 0.5rem;
}

.empty-state {
  padding-block: 0.25rem;
  padding-left: 1.3rem;
  color: var(--bks-text-lighter);
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
