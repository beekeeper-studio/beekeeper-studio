<template>
  <base-modal :name="modalName" @submit="move" :loading="loadingFolders">
    <template #title>
      <template v-if="target">
        Move
        <span class="target-name">
          <i class="material-icons" :data-target-type="target.type">
            {{ target.type === "query" ? "code" : "link" }}
          </i>
          {{ target.type === "query" ? target.value.title : target.value.name }}
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
        <span v-if="parentId === null" class="current-location">
          (current location)
        </span>
      </label>

      <tree
        v-else
        :folders="folderNodes"
        :expanded-ids="expandedIds"
        @update:expandedIds="setExpandedIds"
      >
        <template #folder="{ props }">
          <button
            type="button"
            class="move-folder-row"
            @click="handleFolderClick($event, props.node.ref)"
            :class="{
              selected: selectedFolderId === props.node.ref.id,
              empty: !props.node.children?.length,
              invalid: !isValidTarget(props.node.ref.id),
            }"
          >
            <tree-folder v-bind="props" tag="span" />
            <span
              v-if="parentId === props.node.ref.id"
              class="current-location"
            >
              (current location)
            </span>
          </button>
        </template>
      </tree>
    </template>
    <template #footer="{ close }">
      <template v-if="target">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="!isValidTarget(selectedFolderId) || saving"
        >
          Move
        </button>
      </template>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import { IConnection } from "@/common/interfaces/IConnection";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import ContentPlaceholder from "@/components/common/loading/ContentPlaceholder.vue";
import ContentPlaceholderText from "@/components/common/loading/ContentPlaceholderText.vue";
import { getSelfAndAncestors } from "@/common/utils/folderTree";

type Target =
  | { type: "connection"; value: IConnection }
  | { type: "query"; value: ISavedQuery };

export default Vue.extend({
  components: {
    BaseModal,
    Tree,
    TreeFolder,
    ContentPlaceholder,
    ContentPlaceholderText,
  },
  data() {
    return {
      modalName: "move-item-modal",
      target: null as Target | null,
      selectedFolderId: null as number | null,
      saving: false,
      loadingFolders: false,
      expandedIds: [],
    };
  },
  computed: {
    ...mapGetters(["isCloud"]),
    folderPath() {
      if (this.target?.type === "query") {
        return "data/queryFolders";
      }
      return "data/connectionFolders";
    },
    folders() {
      if (!this.target) {
        return [];
      }
      return this.$store.state[this.folderPath].items;
    },
    folderNodes() {
      if (!this.target) {
        return [];
      }
      return this.$store.state[this.folderPath].nodes.items;
    },
    rootBindings() {
      return [{ event: AppEvent.openMoveFileModal, handler: this.open }];
    },
    parentId(): number | null {
      if (this.target.type === "query") {
        return this.target.value.queryFolderId;
      }
      return this.target.value.connectionFolderId;
    },
  },
  methods: {
    async save() {
      if (this.target.type === "query") {
        await this.$store.dispatch("data/queries/reorder", {
          item: this.target.value,
          queryFolderId: this.selectedFolderId,
          position: { before: null },
        });
      } else if (this.target.type === "connection") {
        await this.$store.dispatch("data/connections/reorder", {
          item: this.target.value,
          connectionFolderId: this.selectedFolderId,
          position: { before: null },
        });
      } else {
        throw new Error(
          `Cannot save: unsupported target type "${this.target.type}"`
        );
      }
    },
    async open(target: Target) {
      this.target = target;
      this.selectedFolderId = this.parentId;
      this.expandedIds = [];

      this.$modal.show(this.modalName);

      this.loadingFolders = true;
      try {
        await this.$store.dispatch(`${this.folderPath}/ensureAllLoaded`);
      } finally {
        this.loadingFolders = false;
      }

      // Expand ancestors
      this.expandedIds = getSelfAndAncestors(this.parentId, this.folders).map(
        (f) => `folder-${f.id}`
      );
    },
    setExpandedIds(expandedIds: string[]) {
      this.expandedIds = expandedIds;
    },
    handleFolderClick(event: MouseEvent, folder: IFolder) {
      if (folder.id !== this.selectedFolderId) {
        event.stopPropagation();
        this.selectedFolderId = folder.id;
      }
    },
    async move() {
      if (!this.isValidTarget(this.selectedFolderId) || this.saving) {
        return;
      }
      this.saving = true;
      try {
        await this.save();
        this.$modal.hide(this.modalName);
      } catch (ex) {
        this.$noty.error(`Move Error: ${ex.message}`);
      } finally {
        this.saving = false;
      }
    },
    isValidTarget(folderId: number) {
      return folderId !== this.parentId;
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

<style lang="scss" scoped>
.target-name {
  display: flex;
  align-items: center;
  gap: 0.25rem;

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

  label {
    height: 1.75rem;
  }

  &:hover {
    background: rgb(from var(--theme-base) r g b / 3.5%);
  }

  &.selected {
    background: rgb(from var(--theme-base) r g b / 8%);

    &::before {
      position: absolute;
      top: 0;
      left: -0.5rem;
      bottom: 0;
      width: 3px;
      border-radius: 9999px;
      content: "";
      background: var(--theme-secondary);
    }
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

  &.invalid::v-deep .BksTree-folder .name {
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
