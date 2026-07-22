<template>
  <div class="BksUiKit BksTree">
    <slot v-if="rootNodes.length === 0" name="empty">
      <div class="BksTree-empty">No items</div>
    </slot>
    <template v-else>
      <tree-node
        v-for="node of rootNodes"
        :key="node.id"
        :node="node"
        :all-items="itemNodes"
        :descendants-map="descendantsMap"
        :depth="0"
        :internal-id="internalId"
        :expanded-folder-ids="expandedFolderIds"
        :drop-target="dropTarget"
        :can-drop="canDrop"
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
      </tree-node>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import props from "./props";
import {
  buildDescendantsMap,
  buildFolderNodes,
  buildItemNodes,
} from "./tree";
import TreeNode from "./TreeNode.vue";
import { uuidv4 } from "../../utils/uuid";
import {
  DropPosition,
  DropSlot,
  DropTarget,
  FolderNode,
  ItemNode,
  Node,
  TreeNodeMoveEvent,
  Item,
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
    folderNodes(): FolderNode[] {
      return buildFolderNodes(this.folders);
    },

    itemNodes(): ItemNode[] {
      if (!this.itemParentKey) {
        if (this.items.length > 0) {
          console.warn(
            "`itemParentKey` is not provided. Cannot map items to folders."
          );
        }
        return [];
      }
      return buildItemNodes(this.items as Item[], this.itemParentKey);
    },

    descendantsMap(): Map<number, Set<number>> {
      return buildDescendantsMap(this.folderNodes);
    },

    rootFolderNodes(): FolderNode[] {
      return this.folderNodes.filter((node) => node.parentId == null);
    },

    rootItemNodes(): ItemNode[] {
      return this.itemNodes
        .filter((item) => item.parentId === null)
        .sort((a, b) => a.position - b.position);
    },

    rootNodes(): Node[] {
      return [...this.rootFolderNodes, ...this.rootItemNodes];
    },
  },

  methods: {
    isInSubtree(ancestorId: number, folderId: number | null): boolean {
      if (folderId == null) {
        return false;
      }
      if (folderId === ancestorId) {
        return true;
      }
      return this.descendantsMap.get(ancestorId)?.has(folderId) ?? false;
    },

    canDropOn(source: Node, target: Node): boolean {
      // Dropping onto itself is always rejected. A folder additionally can't
      // land anywhere inside its own subtree — that would reparent it under
      // itself.
      if (source.id === target.id) {
        return false;
      }
      if (source.type !== "folder") {
        return true;
      }
      const targetFolderId =
        target.type === "folder" ? target.ref.id : target.parentId;
      return !this.isInSubtree(source.ref.id, targetFolderId);
    },

    canDrop(target: Node): boolean {
      if (!this.draggedNode) {
        return false;
      }
      return this.canDropOn(this.draggedNode, target);
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
      if (!source || !position || !this.canDropOn(source, target)) {
        return;
      }
      let slot: DropSlot;
      // NOTE: Folder positioning is not supported
      if (target.type === "folder") {
        slot = { before: null };
      } else if (position === "after") {
        slot = { after: target.ref.id };
      } else {
        slot = { before: target.ref.id };
      }
      const payload: TreeNodeMoveEvent = {
        source,
        target,
        position: slot,
        parentId: position === "inside" ? target.ref.id : target.parentId,
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

      if (position !== "inside") {
        return;
      }

      if (this.expandedFolderIds.includes(node.ref.id)) {
        return;
      }

      this.expandTimer = setTimeout(() => {
        this.$emit("update:expandedFolderIds", [
          ...this.expandedFolderIds,
          node.ref.id,
        ]);
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

    toggleExpanded(node: Node) {
      const index = this.expandedFolderIds.indexOf(node.ref.id);
      if (index === -1) {
        // add
        this.$emit("update:expandedFolderIds", [
          ...this.expandedFolderIds,
          node.ref.id,
        ]);
      } else {
        // remove
        this.$emit("update:expandedFolderIds",
          this.expandedFolderIds.toSpliced(index, 1)
        );
      }
    },
  },

  beforeDestroy() {
    this.clearExpandTimer();
  },
});
</script>

<style scoped lang="scss">
.BksTree-empty {
  padding-block: 0.25rem;
  padding-left: 1.3rem;
  color: var(--bks-text-lighter);
}
</style>
