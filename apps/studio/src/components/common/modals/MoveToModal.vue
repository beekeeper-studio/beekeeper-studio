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
        :folders="filteredFolders"
        :expanded-folder-ids.sync="expandedFolderIds"
      >
        <template #folder="{ props }">
          <label
            class="move-folder-row"
            :class="{
              selected: selectedFolderId === props.node.ref.id,
              empty: !props.node.nodes?.length,
            }"
          >
            <input
              class="move-folder-radio"
              type="radio"
              name="move-to-folder"
              :disabled="currentFolderId === props.node.ref.id"
              :value="props.node.ref.id"
              v-model="selectedFolderId"
            >
            <tree-folder v-bind="props" tag="div">
              <template #name>
                {{ props.node.ref.name }}
                <span
                  v-if="currentFolderId === props.node.ref.id"
                  class="current-location"
                >
                  (current location)
                </span>
              </template>
            </tree-folder>
          </label>
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
import { getDescendants, getSelfAndAnscestors } from "@/lib/data/folder";

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
      expandedFolderIds: [],
    };
  },
  computed: {
    ...mapState("data/connectionFolders", { connectionFolders: "items" }),
    ...mapState("data/queryFolders", { queryFolders: "items" }),
    ...mapGetters(["isCloud"]),
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
    descendants(): WeakSet<IFolder> {
      return new WeakSet(getDescendants(this.target.value.id, this.folders));
    },
    filteredFolders(): IFolder[] {
      return this.folders.filter((folder: IFolder) => {
        // Prevent moving a team folder to a personal folder
        if (this.isTeamFolder && folder.personal) {
          return false;
        }

        if (this.isFolder && this.descendants.has(folder)) {
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

      // Expand anscestors
      this.expandedFolderIds = getSelfAndAnscestors(
        this.currentFolderId,
        this.folders
      ).map((f) => f.id);

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
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
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

  &::v-deep .BksTree-folder:hover {
    background-color: transparent;
  }

  &:has([disabled])::v-deep .BksTree-folder .name {
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

/** Tree component */
::v-deep [data-node-empty="true"] .expand-icon {
  visibility: hidden;
}
</style>
