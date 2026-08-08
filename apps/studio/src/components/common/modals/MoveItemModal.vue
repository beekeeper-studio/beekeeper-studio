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
      <folder-tree-picker
        :key="`${folderPath}-${target.value.id}`"
        :folder-path="folderPath"
        v-model="selectedFolderId"
        :show-top-level="!isCloud"
        :current-location-id="parentId"
        :show-loading-placeholder="false"
        @update:loading="loadingFolders = $event"
      />
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
import FolderTreePicker from "@/components/common/FolderTreePicker.vue";
import { AppEvent } from "@/common/AppEvent";
import { IConnection } from "@/common/interfaces/IConnection";
import ISavedQuery from "@/common/interfaces/ISavedQuery";

type Target =
  | { type: "connection"; value: IConnection }
  | { type: "query"; value: ISavedQuery };

export default Vue.extend({
  components: { BaseModal, FolderTreePicker },
  data() {
    return {
      modalName: "move-item-modal",
      target: null as Target | null,
      selectedFolderId: null as number | null,
      saving: false,
      loadingFolders: false,
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
    open(target: Target) {
      this.target = target;
      this.selectedFolderId = this.parentId;
      this.$modal.show(this.modalName);
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
</style>
