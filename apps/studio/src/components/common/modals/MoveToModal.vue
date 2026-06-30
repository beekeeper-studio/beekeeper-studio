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
      <template v-else>Move</template>
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
        />
        <i class="move-folder-icon material-icons">subdirectory_arrow_left</i>
        <span class="move-folder-name">(Top level)</span>
        <span v-if="currentFolderId === null" class="current-location">
          (current location)
        </span>
      </label>

      <div
        class="move-folder-group"
        v-for="{ folder, subfolders } in folderTree"
        :key="folder.id"
      >
        <label
          class="move-folder-row"
          :class="{ selected: selectedFolderId === folder.id }"
        >
          <input
            class="move-folder-radio"
            type="radio"
            name="move-to-folder"
            :value="folder.id"
            v-model="selectedFolderId"
          />
          <i class="move-folder-icon material-icons">folder</i>
          <span class="move-folder-name">{{ folder.name }}</span>
          <span v-if="currentFolderId === folder.id" class="current-location">
            (current location)
          </span>
        </label>
        <template v-if="subfolders.length">
          <label
            v-for="subfolder in subfolders"
            :key="subfolder.id"
            class="move-folder-row"
            :class="{ selected: selectedFolderId === subfolder.id }"
            style="--node-depth: 1"
          >
            <input
              class="move-folder-radio"
              type="radio"
              name="move-to-folder"
              :value="subfolder.id"
              v-model="selectedFolderId"
            />
            <i class="move-folder-icon material-icons">folder</i>
            <span class="move-folder-name">{{ subfolder.name }}</span>
            <span
              v-if="currentFolderId === subfolder.id"
              class="current-location"
            >
              (current location)
            </span>
          </label>
        </template>
      </div>
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

type Target =
  | { type: "connection"; value: IConnection }
  | { type: "query"; value: ISavedQuery }
  | { type: "connectionFolder"; value: IFolder }
  | { type: "queryFolder"; value: IFolder };

export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "move-to-modal",
      target: null as Target | null,
      selectedFolderId: null as number | null,
      saving: false,
    };
  },
  computed: {
    ...mapState("data/connectionFolders", { connectionFolders: "items" }),
    ...mapState("data/queryFolders", { queryFolders: "items" }),
    ...mapGetters(["isCloud"]),
    rootBindings() {
      return [{ event: AppEvent.openMoveFileModal, handler: this.open }];
    },
    // Folder targets move themselves (re-parent); connection/query targets move
    // into a folder. Folders are capped at 2 levels, so only subfolders are
    // ever moved and their destinations are top level or another root.
    isFolder(): boolean {
      return (
        this.target?.type === "connectionFolder" ||
        this.target?.type === "queryFolder"
      );
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
    folderTree() {
      return this.folders
        .filter((f) => !f.parentId)
        .map((folder) => ({
          folder,
          // A folder being moved can't nest into a subfolder (2-level cap), so
          // subfolders aren't shown as destinations for folder targets.
          subfolders: this.isFolder
            ? []
            : this.folders.filter((f) => f.parentId === folder.id),
        }));
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
    ...mapActions("data/connectionFolders", {
      moveConnectionToFolder: "moveToFolder",
      saveConnectionFolder: "save",
    }),
    ...mapActions("data/queryFolders", {
      moveQueryToFolder: "moveToFolder",
      saveQueryFolder: "save",
    }),
    open(target: Target) {
      this.target = target;
      this.selectedFolderId = this.currentFolderId;
      this.$modal.show(this.modalName);
    },
    async move() {
      if (!this.canMove || this.saving) return;
      this.saving = true;
      try {
        if (this.target.type === "queryFolder") {
          await this.saveQueryFolder({
            ...this.target.value,
            parentId: this.selectedFolderId,
          });
        } else if (this.target.type === "connectionFolder") {
          await this.saveConnectionFolder({
            ...this.target.value,
            parentId: this.selectedFolderId,
          });
        } else {
          const folder =
            this.selectedFolderId == null
              ? null
              : this.folders.find((f) => f.id === this.selectedFolderId);
          if (this.target.type === "query") {
            await this.moveQueryToFolder({ query: this.target.value, folder });
          } else {
            await this.moveConnectionToFolder({
              connection: this.target.value,
              folder,
            });
          }
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
  --node-depth: 0;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding-left: calc(0.45rem + (var(--node-depth) * 1.25rem));
  height: 2rem;
  border-radius: 4px;
  color: rgb(from var(--theme-base) r g b / 77%);
  cursor: pointer;

  &:hover {
    background: rgb(from var(--theme-base) r g b / 3.5%);
  }

  &.selected {
    background: rgb(from var(--theme-base) r g b / 10%);
  }

  /* The radio is visually hidden, so surface keyboard focus on the row.
     :focus-visible keeps this off for mouse clicks. */
  &:has(.move-folder-radio:focus-visible) {
    outline: 2px solid var(--theme-base);
    outline-offset: -2px;
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
