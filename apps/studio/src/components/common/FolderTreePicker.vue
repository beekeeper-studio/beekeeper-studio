<template>
  <div class="folder-tree-picker" :class="{ disabled }">
    <label
      v-if="showTopLevel"
      class="folder-row"
      :class="{ selected: value === null }"
    >
      <input
        class="folder-radio"
        type="radio"
        name="folder-tree-picker"
        :checked="value === null"
        :disabled="disabled"
        @change="selectTopLevel"
      />
      <i class="folder-icon material-icons">subdirectory_arrow_left</i>
      <span class="folder-name">{{ topLevelLabel }}</span>
      <span v-if="isCurrentLocation(null)" class="current-location">
        (current location)
      </span>
    </label>

    <content-placeholder
      v-if="loadingFolders && showLoadingPlaceholder"
      :animated="true"
      :rounded="false"
    >
      <content-placeholder-text :lines="4" />
    </content-placeholder>

    <tree
      v-else
      :folders="folderNodes"
      :expanded-ids="expandedIds"
      @update:expandedIds="setExpandedIds"
    >
      <template #folder="{ props }">
        <button
          type="button"
          class="folder-row"
          @click="handleFolderClick($event, props.node.ref)"
          :disabled="disabled"
          :class="{
            disabled: disabled,
            selected: value === props.node.ref.id,
            empty: !props.node.children?.length,
            invalid: isCurrentLocation(props.node.ref.id),
          }"
        >
          <tree-folder v-bind="props" tag="span" />
          <span
            v-if="isCurrentLocation(props.node.ref.id)"
            class="current-location"
          >
            (current location)
          </span>
        </button>
      </template>
    </tree>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { IFolder } from "@/common/interfaces/IQueryFolder";
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import ContentPlaceholder from "@/components/common/loading/ContentPlaceholder.vue";
import ContentPlaceholderText from "@/components/common/loading/ContentPlaceholderText.vue";
import { getSelfAndAncestors } from "@/common/utils/folderTree";

export default Vue.extend({
  components: { Tree, TreeFolder, ContentPlaceholder, ContentPlaceholderText },
  props: {
    folderPath: {
      type: String,
      required: true,
    },
    value: {
      type: Number,
      default: null,
    },
    showTopLevel: {
      type: Boolean,
      default: false,
    },
    topLevelLabel: {
      type: String,
      default: "(Top level)",
    },
    currentLocationId: {
      type: Number,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false
    },
    // Render the built-in skeleton while folders load. Turn off when the
    // container shows its own loading chrome (e.g. a modal progress bar) and
    // bind the `update:loading` event instead.
    showLoadingPlaceholder: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      expandedIds: [] as string[],
      loadingFolders: false,
    };
  },
  computed: {
    folders(): IFolder[] {
      return this.$store.state[this.folderPath].items;
    },
    folderNodes() {
      return this.$store.state[this.folderPath].nodes.items;
    },
  },
  methods: {
    setExpandedIds(expandedIds: string[]) {
      if (this.disabled) return;
      this.expandedIds = expandedIds;
    },
    handleFolderClick(event: MouseEvent, folder: IFolder) {
      if (this.disabled) return;
      if (folder.id !== this.value) {
        event.stopPropagation();
        this.$emit("input", folder.id);
      }
    },
    selectTopLevel() {
      if (this.disabled) return;
      if (this.value !== null) {
        this.$emit("input", null);
      }
    },
    isCurrentLocation(id: number | null): boolean {
      return this.currentLocationId !== undefined && id === this.currentLocationId;
    },
    setLoading(loading: boolean) {
      this.loadingFolders = loading;
      this.$emit("update:loading", loading);
    },
  },
  async mounted() {
    // Expand ancestors of the current selection
    this.expandedIds = getSelfAndAncestors(this.value, this.folders).map(
      (f) => `folder-${f.id}`
    );

    this.setLoading(true);
    try {
      await this.$store.dispatch(`${this.folderPath}/load`);
    } finally {
      this.setLoading(false);
    }
  },
});
</script>

<style scoped lang="scss">
.folder-tree-picker.disabled {
  opacity: 0.5;
  cursor: not-allowed;

  // Kill all pointer interaction on the rows (buttons, radios, and the tree's
  // own row element, which handles expand/collapse independently of the button).
  // The container keeps the not-allowed cursor since children no longer capture
  // pointer events.
  .folder-row,
  &::v-deep .BksTree-row {
    pointer-events: none;
  }
}

.folder-row {
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
  &:has(.folder-radio:focus-visible) {
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

label.folder-row {
  height: 1.75rem;
}

/* Visually hidden — selection state is shown via the row highlight. */
input[type="radio"].folder-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.folder-icon {
  flex-shrink: 0;
  color: rgb(from var(--theme-base) r g b / 37%);
}

.folder-name {
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
