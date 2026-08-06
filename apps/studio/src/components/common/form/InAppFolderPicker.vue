<template>
  <div>
    <div class="input-group">
      <input
        :id="inputId"
        type="text"
        class="form-control"
        placeholder="No Folder Selected"
        readonly
        :title="selectedFolderName"
        :value="selectedFolderName"
        :disabled="disabled"
        @click.prevent.stop="openPickerModal"
      >
      <div
        class="input-group-append"
        @click.prevent.stop="openPickerModal"
      >
        <a type="button" class="btn btn-flat">
          {{ buttonText }}
        </a>
      </div>
    </div>
    <base-modal :name="modalName" @submit="selectFolder" :loading="loadingFolders">
      <template #title>
        Select Folder
      </template>
      <template>
        <folder-tree-picker
          v-model="selectedFolderId"
          :folder-path="folderPath"
          :show-top-level="!isCloud"
          @update:loading="loadingFolders = $event"
        />
      </template>
      <template #footer="{ close }">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="submit"
        >
          Select
        </button>
      </template>
    </base-modal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import BaseModal from "@/components/common/modals/BaseModal.vue"
import FolderTreePicker from "@/components/common/FolderTreePicker.vue"
import { IFolder } from "@/common/interfaces/IQueryFolder"
import { getSelfAndAncestors } from "@/common/utils/folderTree"
import { mapGetters } from 'vuex'

export default Vue.extend({
  components: { BaseModal, FolderTreePicker },
  data() {
    return {
      modalName: "select-folder-modal",
      selectedFolderId: null as number | null,
      loadingFolders: false
    }
  },
  props: {
    value: {
      type: Number,
      default: null,
    },
    folderPath: {
      type: String,
      required: true,
    },
    inputId: {
      type: String,
      default: "folder-picker"
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    buttonText: {
      type: String,
      default: "Choose Folder"
    }
  },
  computed: {
    ...mapGetters(["isCloud"]),
    folders(): IFolder[] {
      return this.$store.state[this.folderPath]?.items ?? [];
    },
    selectedFolderName(): string {
      if (this.value == null) return "";
      // getSelfAndAncestors returns [self, parent, ...root]; reverse for a
      // top-down breadcrumb.
      const chain = getSelfAndAncestors(this.value, this.folders);
      return chain.map((f) => f.name).reverse().join(" / ");
    },
  },
  methods: {
    openPickerModal() {
      if (this.disabled) return;
      this.selectedFolderId = this.value ?? null;
      this.$modal.show(this.modalName);
    },
    selectFolder() {
      this.$emit("input", this.selectedFolderId);
      this.$modal.hide(this.modalName);
    },
  },
  async mounted() {
    // Load folders so the input can resolve an already-selected id to its path
    // before the modal is ever opened.
    await this.$store.dispatch(`${this.folderPath}/ensureAllLoaded`);
  },
})

</script>
