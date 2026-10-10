<template>
  <div>
    <div class="input-group">
      <input
        :id="inputId"
        type="text"
        class="form-control folder-path-input"
        placeholder="No Folder Selected"
        readonly
        :title="selectedFolderName"
        :value="selectedFolderName"
        :disabled="disabled"
        @click.prevent.stop="openPicker"
      >
      <div
        class="input-group-append"
        @click.prevent.stop="openPicker"
      >
        <a type="button" class="btn btn-flat">
          {{ buttonText }}
        </a>
      </div>
    </div>

    <slideover
      v-if="nested"
      ref="slideover"
    >
      <template #title>
        <span class="folder-slideover-title">Select Folder</span>
      </template>
      <template>
        <folder-tree-picker
          v-model="selectedFolderId"
          :folder-path="folderPath"
          :show-top-level="!isCloud"
        />
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
          @click.prevent="selectFolder"
        >
          Select
        </button>
      </template>
    </slideover>

    <base-modal
      v-else
      :name="modalName"
      @submit="selectFolder"
      :loading="loadingFolders"
    >
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
import Slideover from "@/components/common/Slideover.vue"
import { IFolder } from "@/common/interfaces/IQueryFolder"
import { getSelfAndAncestors } from "@/common/utils/folderTree"
import { mapGetters } from 'vuex'

export default Vue.extend({
  components: { BaseModal, FolderTreePicker, Slideover },
  data() {
    return {
      modalName: "select-folder-modal",
      selectedFolderId: null as number | null,
      loadingFolders: false,
      // Set on mount once we know whether we're rendered inside a modal box.
      nested: false,
      mountSelector: "",
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
      const chain = getSelfAndAncestors(this.value, this.folders);
      return chain.map((f) => f.name).reverse().join(" / ");
    },
  },
  methods: {
    openPicker() {
      if (this.disabled) return;
      this.selectedFolderId = this.value ?? null;
      if (this.nested) {
        this.$refs.slideover.show();
      } else {
        this.$modal.show(this.modalName);
      }
    },
    selectFolder() {
      this.$emit("input", this.selectedFolderId);
      if (this.nested) {
        this.$refs.slideover.close();
      } else {
        this.$modal.hide(this.modalName);
      }
    }
  },
  async mounted() {
    // Check if already inside a modal
    const box = (this.$el as HTMLElement).closest<HTMLElement>(".v--modal-box");
    if (box) {
      this.nested = true;
    }

    await this.$store.dispatch(`${this.folderPath}/load`);
  },
})
</script>

<style lang="scss" scoped>
.folder-path-input {
  direction: rtl;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.folder-slideover-title {
  font-size: 1.1rem;
  font-weight: 500;
}
</style>
