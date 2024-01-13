<template>
  <div>
    <template v-for="folder in folderTreeData">
      <draggable
        v-if="folder.id === ROOT_FOLDER_ID"
        v-model="folder.items"
        group="saved-connections"
        :key="`--root-${folder.items.length}`"
        :sort="false"
        :force-fallback="true"
        @start="handleStartMoving($event, folder)"
        @end="handleEndMoving($event, folder)"
      >
        <template v-for="item in folder.items">
          <slot :item="item" />
        </template>
      </draggable>
      <sidebar-folder
        v-else
        ref="folderRefs"
        placeholder="No Items"
        :key="`${folder.id}-${folder.items.length}`"
        :title="`${folder.name} (${folder.items.length})`"
        :wrapper-attrs="{ 'data-folder-id': folder.id }"
        :expanded="folder.expanded"
        @expand="handleFolderExpand($event, folder)"
        @contextmenu="handleFolderContextmenu($event, folder)"
      >
        <draggable
          v-model="folder.items"
          group="saved-connections"
          :sort="false"
          :force-fallback="true"
          @start="handleStartMoving($event, folder)"
          @end="handleEndMoving($event, folder)"
          :component-data="{
            attrs: {
              class: 'folder-tree-draggable-body',
            },
          }"
        >
          <template v-for="item in folder.items">
            <!--
              NOTE: passing item directly like v-bind="item" would cause
              the item to lose some properties if it's a class instance.
              -->
            <slot :item="item" />
          </template>
        </draggable>
      </sidebar-folder>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import SidebarFolder from "@/components/common/SidebarFolder.vue";
import Draggable from "vuedraggable";
import {
  buildFolderTreeData,
  ROOT_FOLDER_ID,
  Folder as IFolder,
} from "@/lib/folderTree";

type Folder = IFolder<any>;

export default Vue.extend({
  props: ["folders", "items", "folderKey"],
  components: { SidebarFolder, Draggable },
  data() {
    return {
      movingItem: null,
      movingItemIndex: null,
      movingItemFolder: null,
      mouseUpEventsRegistered: false,
      ROOT_FOLDER_ID,
      folderTreeData: [],
    };
  },
  watch: {
    folderTreeData: {
      async handler() {
        if (!this.movingItem) return;

        const item = this.movingItem;
        const folder: Folder = this.movingItemFolder;

        // IMPORTANT: reset here to prevent looping
        this.resetMovingItem();

        // check if item is moved to another folder
        if (!folder.items.includes(item)) {
          this.handleItemMoved(item);
        }
      },
      deep: true,
    },
  },
  mounted() {
    this.refresh();
  },
  methods: {
    refresh() {
      this.folderTreeData = buildFolderTreeData({
        folders: this.folders,
        items: this.items,
        folderKey: this.folderKey,
      });
    },
    resetMovingItem() {
      this.movingItem = null;
      this.movingItemIndex = null;
      this.movingItemFolder = null;
    },
    registerMouseUpEvents() {
      if (this.mouseUpEventsRegistered) return;

      for (let i = 0; i < this.$refs.folderRefs.length; i++) {
        const folderRef = this.$refs.folderRefs[i];
        folderRef.$el.addEventListener("mouseup", this.handleFolderMouseUp);
      }

      window.addEventListener("mouseup", this.handleWindowMouseUp);
      this.mouseUpEventsRegistered = true;
    },
    unregisterMouseUpEvents() {
      if (!this.mouseUpEventsRegistered) return;

      for (const folderRef of this.$refs.folderRefs) {
        folderRef.$el.removeEventListener("mouseup", this.handleFolderMouseUp);
      }

      window.removeEventListener("mouseup", this.handleWindowMouseUp);
      this.mouseUpEventsRegistered = false;
    },
    handleFolderMouseUp(event: MouseEvent) {
      this.unregisterMouseUpEvents();

      if (!this.movingItem) {
        console.warn(
          "No moving item! Do we register `handleFolderMouseUp` by accident?"
        );
        return;
      }

      const currentTarget = event.currentTarget as HTMLElement;

      // When the ghost item is already in the folder, let sortablejs take care
      // of it so we could prevent calling handleItemMoved twice.
      if (currentTarget.querySelectorAll('.sortable-ghost').length > 0) {
        return;
      }

      const folderId = Number.parseInt(
        currentTarget.getAttribute("data-folder-id")
      );
      const targetFolder = this.folderTreeData.find(
        (folder: Folder) => folder.id === folderId
      );

      if (!targetFolder) {
        console.warn(`Target folder not found! (folder id: ${folderId})`);
        return;
      }

      const movingItem: SavedConnection = this.movingItem;
      const movingItemIndex: number = this.movingItemIndex;
      const movingItemFolder: Folder = this.movingItemFolder;
      // immediately reset movingItem to prevent looping from folders watcher
      this.resetMovingItem();

      // check if we're in the same folder
      if (targetFolder === movingItemFolder) {
        return;
      }

      movingItemFolder.items.splice(movingItemIndex, 1);
      targetFolder.items.push(movingItem);

      this.handleItemMoved(movingItem, targetFolder);
    },
    handleWindowMouseUp() {
      this.unregisterMouseUpEvents();
    },
    handleEndMoving() {
      this.unregisterMouseUpEvents();
    },
    handleStartMoving(event: any, fromFolder: Folder) {
      this.registerMouseUpEvents();

      const index = event.oldIndex;
      this.movingItem = fromFolder.items[index];
      this.movingItemIndex = index;
      this.movingItemFolder = fromFolder;
    },
    async handleItemMoved(movedItem: SavedConnection, targetFolder?: Folder) {
      this.unregisterMouseUpEvents();

      if (!targetFolder) {
        targetFolder = this.folderTreeData.find((folder: Folder) =>
          folder.items.find((item) => item === movedItem)
        );
      }

      if (!targetFolder) {
        console.warn("Target folder not found!");
        return;
      }

      this.$emit("itemMoved", movedItem, targetFolder);
    },
    handleFolderExpand(_event: any, folder: Folder) {
      const expanded = !folder.expanded;
      Vue.set(folder, "expanded", expanded);
      this.$emit("folderExpand", folder, expanded);
    },
    handleFolderContextmenu(event: any, folder: Folder) {
      this.$bks.openMenu({
        item: folder,
        options: [
          {
            name: folder.expanded ? "Collapse" : "Expand",
            slug: "expand-or-collapse",
            handler: () => {
              this.handleFolderExpand(event, folder);
            },
          },
          {
            name: "Rename",
            slug: "rename",
            handler: async () => {
              const { canceled, value } = await this.$prompt({
                title: "Rename a folder",
                initialValue: folder.name,
              });

              if (canceled) return;

              await this.$emit("folderRename", folder, value);

              Vue.set(folder, "name", value);
            },
            // TODO add shortcut probably?
            // shortcut: this.ctrlOrCmd('z')
          },
          {
            name: "Remove",
            slug: "remove",
            handler: async () => {
              const confirmed = await this.$confirm(
                "Are you sure?",
                `This will only remove ${folder.name} folder, not its connections.`
              );

              if (!confirmed) return;

              await this.$emit("folderRemove", folder);

              this.refresh();
            },
            // TODO add shortcut probably?
            // shortcut: this.ctrlOrCmd('z')
          },
        ],
        event,
      });
    },
  },
});
</script>
