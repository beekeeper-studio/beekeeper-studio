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

    <mounting-portal
      v-if="nested"
      :mount-to="mountSelector"
      append
    >
      <transition name="folder-slideover">
        <div
          v-if="panelOpen"
          class="folder-slideover"
        >
          <div class="folder-slideover-header">
            <a
              href="#"
              class="folder-slideover-back"
              @click.prevent="cancelPanel"
            >
              <i class="material-icons">arrow_back</i>
            </a>
            <span class="folder-slideover-title">Select Folder</span>
          </div>
          <div class="folder-slideover-body">
            <folder-tree-picker
              v-model="selectedFolderId"
              :folder-path="folderPath"
              :show-top-level="!isCloud"
            />
          </div>
          <div class="folder-slideover-footer">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="cancelPanel"
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
          </div>
        </div>
      </transition>
    </mounting-portal>

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
import { MountingPortal } from 'portal-vue'
import BaseModal from "@/components/common/modals/BaseModal.vue"
import FolderTreePicker from "@/components/common/FolderTreePicker.vue"
import { IFolder } from "@/common/interfaces/IQueryFolder"
import { getSelfAndAncestors } from "@/common/utils/folderTree"
import { mapGetters } from 'vuex'

let pickerUid = 0

export default Vue.extend({
  components: { BaseModal, FolderTreePicker, MountingPortal },
  data() {
    return {
      modalName: "select-folder-modal",
      selectedFolderId: null as number | null,
      loadingFolders: false,
      // Set on mount once we know whether we're rendered inside a modal box.
      nested: false,
      mountSelector: "",
      panelOpen: false,
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
        this.panelOpen = true;
      } else {
        this.$modal.show(this.modalName);
      }
    },
    selectFolder() {
      this.$emit("input", this.selectedFolderId);
      if (this.nested) {
        this.panelOpen = false;
      } else {
        this.$modal.hide(this.modalName);
      }
    },
    cancelPanel() {
      this.panelOpen = false;
    },
  },
  async mounted() {
    // Check if already inside a modal
    const box = (this.$el as HTMLElement).closest<HTMLElement>(".v--modal-box");
    if (box) {
      if (!box.id) {
        box.id = `bks-modal-host-${pickerUid++}`;
      }
      this.mountSelector = `#${box.id}`;
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

.folder-slideover {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: var(--theme-bg);
}

.folder-slideover-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 1.2rem;
  padding-block: 0.8rem;
}

.folder-slideover-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 1.8rem;
  color: var(--text-dark);
  transition: background 0.15s ease-in-out;

  &:hover,
  &:focus {
    background: rgb(from var(--theme-base) r g b / 10%);
  }

  .material-icons {
    font-size: 1.25rem;
  }
}

.folder-slideover-title {
  font-size: 1.1rem;
  font-weight: 500;
}

.folder-slideover-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 1.2rem 0.8rem;
}

.folder-slideover-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-inline: 1.2rem;
  padding-bottom: 0.8rem;
}

// Slide in from / out to the right. The modal box clips the overflow.
.folder-slideover-enter-active,
.folder-slideover-leave-active {
  transition: transform 0.25s ease;
}

.folder-slideover-enter,
.folder-slideover-leave-to {
  transform: translateX(100%);
}
</style>
