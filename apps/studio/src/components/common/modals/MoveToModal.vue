<template>
  <base-modal :name="modalName" @submit="move">
    <template #title>
      <template v-if="target">
        Move
        <span class="target-name">
          <i class="material-icons" :data-target-type="target.type">
            {{ targetIcon }}
          </i>
          {{ targetName }}
        </span>
        to
      </template>
      <template v-else>
        Move
      </template>
    </template>
    <template v-if="target">
      <label
        v-if="!isCloud"
        class="move-folder-row"
        :class="{ selected: selectedFolderId === null }"
      >
        <input
          class="move-folder-radio"
          type="radio"
          name="move-to-folder"
          :value="null"
          v-model="selectedFolderId"
        >
        <i class="move-folder-icon material-icons">subdirectory_arrow_left</i>
        <span class="move-folder-name">(Top level)</span>
        <span v-if="currentFolderId === null" class="current-location">
          (current location)
        </span>
      </label>

      <tree
        :folders="filteredFolderNodes"
        :items="itemNodes"
        :expanded-ids.sync="expandedIds"
      >
        <template #folder="{ props }">
          <button
            type="button"
            class="move-folder-row"
            @click="handleFolderClick($event, props.node.ref)"
            :class="{
              selected: selectedFolderId === props.node.ref.id,
              empty: !props.node.children?.length,
              current: currentFolderId === props.node.ref.id,
            }"
          >
            <tree-folder v-bind="props" tag="span" />
            <span
              v-if="currentFolderId === props.node.ref.id"
              class="current-location"
            >
              (current location)
            </span>
          </button>
        </template>
        <!-- Items are only here so folder counts include them. -->
        <template #item>
          <span />
        </template>
      </tree>
    </template>
    <template #footer="{ close }">
      <button class="btn btn-flat" type="button" @click.prevent="close">
        Cancel
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        :disabled="!canMove || saving"
      >
        Move
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import { IConnection } from "@/common/interfaces/IConnection";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import { FolderNodeWithRef, getSelfAndAnscestors } from "@/common/folderTree";

type Target =
  | { type: "connection"; value: IConnection }
  | { type: "query"; value: ISavedQuery }
  | { type: "connectionFolder"; value: IFolder }
  | { type: "queryFolder"; value: IFolder };

export default Vue.extend({
  components: { BaseModal, Tree, TreeFolder },
  data() {
    return {
      modalName: "move-to-modal",
      target: null as Target | null,
      selectedFolderId: null as number | null,
      saving: false,
      expandedIds: [],
    };
  },
  computed: {
    ...mapState("data/connectionFolders", { connectionFolders: "items" }),
    ...mapState("data/queryFolders", { queryFolders: "items" }),
    ...mapGetters(["isCloud"]),
    ...mapGetters({
      connectionFolderNodes: "data/connectionFolders/nodes",
      queryFolderNodes: "data/queryFolders/nodes",
      connectionItemNodes: "data/connections/nodes",
      queryItemNodes: "data/queries/nodes",
    }),
    rootBindings() {
      return [{ event: AppEvent.openMoveFileModal, handler: this.open }];
    },
    isFolder(): boolean {
      return (
        this.target?.type === "connectionFolder" ||
        this.target?.type === "queryFolder"
      );
    },
    isTeamFolder() {
      return this.isCloud && this.isFolder && !this.target.value.personal;
    },
    isQueryTarget(): boolean {
      return (
        this.target?.type === "query" || this.target?.type === "queryFolder"
      );
    },
    folders() {
      if (!this.target) return [];
      return this.isQueryTarget ? this.queryFolders : this.connectionFolders;
    },
    itemNodes() {
      if (!this.target) {
        return [];
      }
      if (this.isQueryTarget) {
        return this.queryItemNodes;
      }
      return this.connectionItemNodes;
    },
    folderNodes() {
      if (!this.target) {
        return [];
      }
      if (this.isQueryTarget) {
        return this.queryFolderNodes;
      }
      return this.connectionFolderNodes;
    },
    filteredFolderNodes() {
      return this.folderNodes.filter((node: FolderNodeWithRef) => {
        // Prevent moving a team folder to a personal folder
        if (this.isTeamFolder && node.ref.personal) {
          return false;
        }

        // Prevent moving a folder to its own subfolders
        if (this.isFolder && node.ref.parentId === this.target.value.id) {
          return false;
        }

        return true;
      });
    },
    targetIcon(): string {
      if (!this.target) return "";
      if (this.isFolder) return "folder";
      return this.target.type === "query" ? "code" : "link";
    },
    targetName(): string {
      if (!this.target) return "";
      return this.target.type === "query"
        ? this.target.value.title
        : this.target.value.name;
    },
    currentFolderId(): number | null {
      if (!this.target) return null;
      if (this.isFolder) return this.target.value.parentId ?? null;
      return (
        (this.target.type === "query"
          ? this.target.value.queryFolderId
          : this.target.value.connectionFolderId) ?? null
      );
    },
    canMove(): boolean {
      return this.selectedFolderId !== this.currentFolderId;
    },
  },
  methods: {
    ...mapActions({
      moveConnectionFolder: "data/connectionFolders/move",
      moveConnection: "data/connections/move",
      moveQueryFolder: "data/queryFolders/move",
      moveQuery: "data/queries/move",
    }),
    open(target: Target) {
      this.target = target;
      this.selectedFolderId = this.currentFolderId;

      // Expand anscestors
      this.expandedIds = getSelfAndAnscestors(
        this.currentFolderId,
        this.folders
      ).map((f) => `folder-${f.id}`);

      this.$modal.show(this.modalName);
    },
    handleFolderClick(event: MouseEvent, folder: IFolder) {
      if (folder.id !== this.selectedFolderId) {
        event.stopPropagation();
        this.selectedFolderId = folder.id;
      }
    },
    async move() {
      if (!this.canMove || this.saving) return;
      this.saving = true;
      const payload = {
        sourceId: this.target.value.id,
        targetId: this.selectedFolderId,
        position: "inside",
      };
      try {
        if (this.target.type === "queryFolder") {
          await this.moveQueryFolder(payload);
        } else if (this.target.type === "connectionFolder") {
          await this.moveConnectionFolder(payload);
        } else if (this.target.type === "query") {
          await this.moveQuery(payload);
        } else if (this.target.type === "connection") {
          await this.moveConnection(payload);
        } else {
          throw new Error(`Cannot move an unknown target: ${this.target.type}`);
        }
        this.$modal.hide(this.modalName);
      } catch (ex) {
        this.$noty.error(`Move Error: ${ex.message}`);
      } finally {
        this.saving = false;
      }
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<style scoped>
.target-name {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  [data-target-type="connectionFolder"],
  [data-target-type="queryFolder"] {
    color: var(--text-lighter);
  }
  [data-target-type="query"] {
    color: var(--brand-pink);
  }
}

.move-folder-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgb(from var(--theme-base) r g b / 77%);
  font: inherit;
  cursor: pointer;

  label& {
    height: 1.75rem;
  }

  &:hover {
    background: rgb(from var(--theme-base) r g b / 3.5%);
  }

  &.selected {
    background: rgb(from var(--theme-base) r g b / 10%);
  }

  /* The radio is visually hidden, so surface keyboard focus on the row.
     :focus-visible keeps this off for mouse clicks. */
  &:focus-visible,
  &:has(:focus-visible),
  &:has(.move-folder-radio:focus-visible) {
    outline: 2px solid var(--theme-base);
    outline-offset: -2px;
  }

  &::v-deep .BksTree-folder {
    width: auto;

    &:hover {
      background-color: transparent;
    }
  }

  &.current::v-deep .BksTree-folder .name {
    opacity: 0.5;
  }

  &.empty::v-deep .BksTree-folder .expand-icon {
    visibility: hidden;
  }
}

/* Visually hidden — selection state is shown via the row highlight + check icon. */
input[type="radio"].move-folder-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.move-folder-icon {
  flex-shrink: 0;
  color: rgb(from var(--theme-base) r g b / 37%);
}

.move-folder-name {
  overflow: hidden;
  font-size: 1rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.current-location {
  font-style: italic;
  font-size: 0.831rem;
  color: var(--text-lighter);
}
</style>
