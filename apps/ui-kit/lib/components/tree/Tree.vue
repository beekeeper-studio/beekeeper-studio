<template>
  <div class="BksUiKit BksTree">
    <slot v-if="rootNodes.length === 0" name="empty" />
    <template v-else>
      <tree-node
        v-for="node of rootNodes"
        :key="node.id"
        :node="node"
        :all-items="items"
        :depth="0"
        :internal-id="internalId"
        :expanded-ids="expandedIds"
        :drop-target="dropTarget"
        :dragged-node="draggedNode"
        :can-drop="canDrop"
        :filter="filter"
        @node-click="handleNodeClick"
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
        <template v-slot:folder-header="slotProps">
          <slot name="folder-header" v-bind="slotProps" />
        </template>
        <template v-slot:folder-footer="slotProps">
          <slot name="folder-footer" v-bind="slotProps" />
        </template>
        <template
          v-if="$scopedSlots['folder-empty']"
          v-slot:folder-empty="slotProps"
        >
          <slot name="folder-empty" v-bind="slotProps" />
        </template>
      </tree-node>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import props from "./props";
import { buildDescendantsMap, destinationOf } from "./tree";
import TreeNode from "./TreeNode.vue";
import { uuidv4 } from "../../utils/uuid";
import {
  DropPosition,
  DropTarget,
  FolderNode,
  ItemNode,
  Node,
  TreeNodeMoveEvent,
} from "./types";

const EXPAND_DELAY = 600;

export default Vue.extend({
  props,

  components: { TreeNode },

  data() {
    return {
      internalId: uuidv4(),
      draggedNode: null as Node | null,
      dropTarget: null as DropTarget | null,
      expandTimer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  computed: {
    descendantsMap(): Map<FolderNode["id"], Set<FolderNode["id"]>> {
      return buildDescendantsMap(this.folders);
    },

    rootFolderNodes(): FolderNode[] {
      return this.folders.filter((node) => node.parentId === null);
    },

    rootItemNodes(): ItemNode[] {
      return this.items.filter((node) => node.parentId === null)
    },

    rootNodes(): Node[] {
      return [...this.rootFolderNodes, ...this.rootItemNodes];
    },
  },

  methods: {
    isInSubtree(
      ancestorId: FolderNode["id"],
      folderId: FolderNode["id"] | null
    ): boolean {
      if (folderId === null) {
        return false;
      }
      if (folderId === ancestorId) {
        return true;
      }
      return this.descendantsMap.get(ancestorId)?.has(folderId) ?? false;
    },

    canDropOn(source: Node, target: Node, position: DropPosition): boolean {
      if (source.id === target.id) {
        return false;
      }
      // An item can be reordered among its siblings, so landing back in the
      // folder it came from is a real move for it, unlike for a folder.
      if (source.type !== "folder") {
        return true;
      }
      const destination = destinationOf(target, position);
      if (destination === source.parentId) {
        return false;
      }
      // A folder can't land inside its own subtree — that would reparent it
      // under itself.
      return !this.isInSubtree(source.id, destination);
    },

    canDrop(target: Node, position: DropPosition): boolean {
      if (!this.draggedNode) {
        return false;
      }
      return this.canDropOn(this.draggedNode, target, position);
    },

    handleNodeClick(node: Node) {
      if (node.type === "folder") {
        this.toggleExpanded(node);
      }
      this.$emit("bks-tree-node-click", node);
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
      if (
        this.dropTarget?.id === node.id &&
        this.dropTarget.position === position
      ) {
        return;
      }
      this.dropTarget = { id: node.id, position };
      this.scheduleExpand(node, position);
    },

    handleNodeDragLeave(node: Node) {
      // A late dragleave must not wipe the next row's target.
      if (this.dropTarget?.id !== node.id) {
        return;
      }
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    handleNodeDrop(target: Node) {
      const source = this.draggedNode;
      const position = this.dropTarget?.position;
      this.resetDrag();
      if (!source || !position || !this.canDropOn(source, target, position)) {
        return;
      }
      const payload: TreeNodeMoveEvent = { source, target, position };
      this.$emit("bks-tree-node-move", payload);
    },

    resetDrag() {
      this.draggedNode = null;
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    scheduleExpand(node: Node, position: DropPosition) {
      this.clearExpandTimer();

      if (position !== "inside" || node.type !== "folder") {
        return;
      }

      if (this.expandedIds.includes(node.id)) {
        return;
      }

      this.expandTimer = setTimeout(() => {
        this.$emit("update:expandedIds", [...this.expandedIds, node.id]);
        this.expandTimer = null;
      }, EXPAND_DELAY);
    },

    clearExpandTimer() {
      if (!this.expandTimer) {
        return;
      }
      clearTimeout(this.expandTimer);
      this.expandTimer = null;
    },

    toggleExpanded(node: FolderNode) {
      const index = this.expandedIds.indexOf(node.id);
      if (index === -1) {
        // add
        this.$emit("update:expandedIds", [...this.expandedIds, node.id]);
      } else {
        // remove
        this.$emit("update:expandedIds", this.expandedIds.toSpliced(index, 1));
      }
    },
  },

  beforeDestroy() {
    this.clearExpandTimer();
  },
});
</script>
