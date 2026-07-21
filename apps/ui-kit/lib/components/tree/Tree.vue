<template>
  <div class="BksUiKit BksTree">
    <slot v-if="rootNodes.length === 0" name="empty">
      <div class="BksTree-empty">No items</div>
    </slot>
    <template v-else>
      <tree-node
        v-for="node of rootNodes"
        :key="`${node.type}-${node.id}`"
        :node="node"
        :all-items="itemNodes"
        :descendants-map="descendantsMap"
        :depth="0"
        :internal-id="internalId"
        :expanded-folder-ids="expandedFolderIds"
        :drop-target="dropTarget"
        :can-drop="canDrop"
        @toggle-expanded="toggleExpanded"
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
  nodeKey,
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
  DragNode,
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
      draggedNode: null as DragNode | null,
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
    nodeKey,

    isInSubtree(ancestorId: number, folderId: number | null): boolean {
      if (folderId == null) {
        return false;
      }
      if (folderId === ancestorId) {
        return true;
      }
      return this.descendantsMap.get(ancestorId)?.has(folderId) ?? false;
    },

    parentIdOf(node: DragNode): number | null {
      if (node.type === "folder") {
        return node.ref.parentId;
      }
      if (!this.itemParentKey) {
        return null;
      }
      return node.ref[this.itemParentKey] ?? null;
    },

    canDropOn(source: DragNode, target: DragNode): boolean {
      // Dropping onto itself is always rejected. A folder additionally can't
      // land anywhere inside its own subtree — that would reparent it under
      // itself.
      if (nodeKey(source) === nodeKey(target)) {
        return false;
      }
      if (source.type !== "folder") {
        return true;
      }
      const targetFolderId =
        target.type === "folder" ? target.ref.id : this.parentIdOf(target);
      return !this.isInSubtree(source.ref.id, targetFolderId);
    },

    canDrop(target: DragNode): boolean {
      if (!this.draggedNode) {
        return false;
      }
      return this.canDropOn(this.draggedNode, target);
    },

    handleNodeDragStart(node: DragNode) {
      this.draggedNode = node;
    },

    handleNodeDragOver({
      node,
      position,
    }: {
      node: DragNode;
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

    handleNodeDragLeave(node: DragNode) {
      // A late dragleave must not wipe the next row's target.
      if (this.dropTarget?.key !== nodeKey(node)) {
        return;
      }
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    handleNodeDrop(target: DragNode) {
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
        parentId:
          position === "inside" ? target.ref.id : this.parentIdOf(target),
      };
      this.$emit("bks-tree-node-move", payload);
    },

    resetDrag() {
      this.draggedNode = null;
      this.dropTarget = null;
      this.clearExpandTimer();
    },

    scheduleExpand(node: DragNode, position: DropPosition) {
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

    toggleExpanded(node: DragNode) {
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
