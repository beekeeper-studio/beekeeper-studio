<template>
  <div class="BksUiKit BksTree">
    <tree-nodes
      :nodes="tree.nodes"
      :internal-id="internalId"
      :expanded-folder-ids="expandedFolderIds"
      :drop-target="dropTarget"
      :can-drop="canDrop"
      @toggle-expanded="toggleExpanded"
      @folder-contextmenu="$emit('bks-tree-folder-contextmenu', $event)"
      @node-dragstart="handleNodeDragStart"
      @node-dragover="handleNodeDragOver"
      @node-dragleave="handleNodeDragLeave"
      @node-drop="handleNodeDrop"
      @node-dragend="resetDrag"
    >
      <template v-slot:folder="slotProps">
        <slot name="folder" v-bind="slotProps" />
      </template>
      <template v-slot:item="slotProps">
        <slot name="item" v-bind="slotProps" />
      </template>
    </tree-nodes>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import props from "./props";
import { buildTree } from "./tree";
import TreeNodes from "./TreeNodes.vue";
import { uuidv4 } from "../../utils/uuid";
import {
  DropPosition,
  DropTarget,
  Node,
  TreeNodeMoveEvent,
  nodeKey,
} from "./types";

const EXPAND_DELAY = 600;

export default Vue.extend({
  props,

  components: { TreeNodes },

  data() {
    return {
      expandedFolderIds: [] as number[],
      internalId: uuidv4(),
      draggedNode: null as Node | null,
      dropTarget: null as DropTarget | null,
      expandTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  computed: {
    tree() {
      // @ts-expect-error
      return buildTree(this.folders, this.items, this.itemParentKey);
    },
  },

  methods: {
    containsKey(node: Node, key: string): boolean {
      if (nodeKey(node) === key) return true;
      return (node.nodes ?? []).some((child) => this.containsKey(child, key));
    },

    canDropOn(source: Node, target: Node): boolean {
      // Rejects dropping onto itself, and onto any descendant — including
      // before/after one, which would still reparent the folder under itself.
      return !this.containsKey(source, nodeKey(target));
    },

    canDrop(target: Node): boolean {
      if (!this.draggedNode) return false;
      return this.canDropOn(this.draggedNode, target);
    },

    handleNodeDragStart(node: Node) {
      this.draggedNode = node;
    },

    handleNodeDragOver({
      node,
      position,
    }: {
      node: Node;
      position: DropPosition;
    }) {
      const key = nodeKey(node);
      if (
        this.dropTarget?.key === key &&
        this.dropTarget.position === position
      ) {
        return;
      }
      this.dropTarget = { key, position };
      this.scheduleExpand(node, position);
    },

    handleNodeDragLeave(node: Node) {
      // A late dragleave must not wipe the next row's target.
      if (this.dropTarget?.key !== nodeKey(node)) return;
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    handleNodeDrop(target: Node) {
      const source = this.draggedNode;
      const position = this.dropTarget?.position;
      this.resetDrag();
      if (!source || !position || !this.canDropOn(source, target)) {
        return;
      }
      const payload: TreeNodeMoveEvent = {
        source,
        target,
        position,
        parentId: position === "inside" ? target.id : target.parentId,
      };
      this.$emit("bks-tree-node-move", payload);
    },

    resetDrag() {
      this.draggedNode = null;
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    scheduleExpand(node: Node, position: DropPosition) {
      this.clearExpandTimer();
      if (position !== "inside") return;
      if (this.expandedFolderIds.includes(node.id)) return;
      this.expandTimer = setTimeout(() => {
        this.expandedFolderIds.push(node.id);
        this.expandTimer = null;
      }, EXPAND_DELAY);
    },

    clearExpandTimer() {
      if (!this.expandTimer) return;
      clearTimeout(this.expandTimer);
      this.expandTimer = null;
    },

    toggleExpanded(node: Node) {
      const index = this.expandedFolderIds.indexOf(node.id);
      if (index === -1) {
        this.expandedFolderIds.push(node.id);
      } else {
        this.expandedFolderIds.splice(index, 1);
      }
    },
  },

  beforeDestroy() {
    this.clearExpandTimer();
  },
});
</script>
