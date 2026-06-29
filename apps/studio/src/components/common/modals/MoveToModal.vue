<template>
  <base-modal :name="modalName" @closed="reset">
    <template #title>
      <template v-if="target">
        Move {{ target.type }} to ...
      </template>
      <template v-else>
        Move to ...
      </template>
    </template>
    <template v-if="target">
      <form
        class="move-folder-list"
        @submit.prevent="move"
      >
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
          <span
            v-if="currentFolderId === null"
            class="move-folder-current"
          >(current location)</span>
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
            >
            <i class="move-folder-icon material-icons">folder</i>
            <span class="move-folder-name">{{ folder.name }}</span>
            <span
              v-if="currentFolderId === folder.id"
              class="move-folder-current"
            >(current location)</span>
          </label>
          <div
            class="move-folder-children"
            v-if="subfolders.length"
          >
            <label
              v-for="subfolder in subfolders"
              :key="subfolder.id"
              class="move-folder-row move-folder-row--child"
              :class="{ selected: selectedFolderId === subfolder.id }"
            >
              <input
                class="move-folder-radio"
                type="radio"
                name="move-to-folder"
                :value="subfolder.id"
                v-model="selectedFolderId"
              >
              <i class="move-folder-icon material-icons">folder</i>
              <span class="move-folder-name">{{ subfolder.name }}</span>
              <span
                v-if="currentFolderId === subfolder.id"
                class="move-folder-current"
              >(current location)</span>
            </label>
          </div>
        </div>
      </form>
    </template>
    <template #footer="{ close }">
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="close"
      >
        Cancel
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="!canMove || saving"
        @click.prevent="move"
      >
        Move
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import { IConnection } from "@/common/interfaces/IConnection";

type Target = {
  type: "connection";
  value: IConnection;
};

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
    ...mapState("data/connectionFolders", { folders: "items" }),
    ...mapGetters(["isCloud"]),
    rootBindings() {
      return [{ event: AppEvent.openMoveToModal, handler: this.open }];
    },
    folderTree() {
      return this.folders
        .filter((f) => !f.parentId)
        .map((folder) => ({
          folder,
          subfolders: this.folders.filter((f) => f.parentId === folder.id),
        }));
    },
    currentFolderId(): number | null {
      return this.target?.value.connectionFolderId ?? null;
    },
    canMove(): boolean {
      return this.selectedFolderId !== this.currentFolderId;
    },
  },
  methods: {
    open(target: Target) {
      this.target = target;
      this.selectedFolderId = target.value.connectionFolderId ?? null;
      this.$modal.show(this.modalName);
    },
    reset() {
      this.target = null;
    },
    async move() {
      if (!this.canMove || this.saving) return;
      this.saving = true;
      try {
        const folder =
          this.selectedFolderId == null
            ? null
            : this.folders.find((f) => f.id === this.selectedFolderId);
        await this.$store.dispatch("data/connectionFolders/moveToFolder", {
          connection: this.target.value,
          folder,
        });
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
/* Mirrors the connection sidebar folder tree (.folder-group / .folder-btn /
   .list-item in app/sidebar/sidebar.scss) with self-contained class names so
   nothing leaks in or out of the global sidebar styles. */
.move-folder-list {
  max-height: 18rem;
  overflow-y: auto;
  padding: 0.2rem 0;
}

.move-folder-group {
  position: relative;
}

.move-folder-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  padding: 0 0.4rem;
  height: 1.9rem;
  border-radius: 4px;
  color: rgb(from var(--theme-base) r g b / 77%);
  cursor: pointer;

  &:hover {
    background: rgb(from var(--theme-base) r g b / 3.5%);

    & .move-folder-icon {
      color: var(--text-dark);
    }
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

.move-folder-row--child {
  padding-left: 0.8rem;
}

/* Visually hidden — selection state is shown via the row highlight + check icon. */
input[type=radio].move-folder-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.move-folder-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: rgb(from var(--theme-base) r g b / 37%);
  transition: color 0.15s ease-in-out;
}

.move-folder-name {
  overflow: hidden;
  font-size: 1rem;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.move-folder-current {
  flex: 1 1 auto;
  font-style: italic;
  font-size: 0.85rem;
  color: var(--text-lighter);
  white-space: nowrap;
}

/* Nested subfolders: indent and draw the vertical guide line, matching the
   sidebar's `.folder-group > div:before`. */
.move-folder-children {
  position: relative;
  margin-left: 0.8rem;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 9px;
    border-left: 1px solid rgb(from var(--theme-base) r g b / 8%);
  }
}
</style>
