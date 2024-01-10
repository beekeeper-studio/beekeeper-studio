<template>
  <div>
    <template v-for="folder in folders">
      <draggable
        v-if="folder.id == null"
        :key="`--root-${folder.items.length}`"
        :list="folder.items"
        group="saved-connections"
        @start="handleStartMoving($event, folder)"
      >
        <connection-list-item
          v-for="c in folder.items"
          :key="c.id"
          :config="c"
          :selected-config="selectedConfig"
          :show-duplicate="true"
          :pinned="pinnedConnections.includes(c)"
          @edit="editConnection"
          @remove="removeConnection"
          @duplicate="duplicateConnection"
          @doubleClick="doubleClickConnection"
        />
      </draggable>
      <sidebar-folder
        v-else
        :key="`${folder.id}-${folder.items.length}`"
        :title="`${folder.name} (${folder.items.length})`"
        placeholder="No Items"
        :expanded-initially="true"
        @contextmenu="handleFolderContextmenu($event, folder)"
      >
        <draggable
          :list="folder.items"
          group="saved-connections"
          @start="handleStartMoving($event, folder)"
        >
          <connection-list-item
            v-for="c in folder.items"
            :key="c.id"
            :config="c"
            :selected-config="selectedConfig"
            :show-duplicate="true"
            :pinned="pinnedConnections.includes(c)"
            @edit="editConnection"
            @remove="removeConnection"
            @duplicate="duplicateConnection"
            @doubleClick="doubleClickConnection"
          />
        </draggable>
      </sidebar-folder>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { ConnectionFolder } from "@/common/appdb/models/ConnectionFolder";
import { mapState, mapGetters } from "vuex";
import SidebarFolder from "@/components/common/SidebarFolder.vue";
import Draggable from "vuedraggable";
import ConnectionListItem from "./connection/ConnectionListItem.vue";

export interface Folder {
  id: number | null;
  name: string;
  description: string;
  entity?: ConnectionFolder;
  items: SavedConnection[];
}

export default Vue.extend({
  props: ["selectedConfig", "sort"],
  components: { SidebarFolder, Draggable, ConnectionListItem },
  data() {
    return {
      movingItem: null,
      folders: [],
    };
  },
  computed: {
    ...mapGetters({
      pinnedConnections: "pinnedConnections/pinnedConnections",
    }),
    ...mapState("data/connectionFolders", {
      connectionFolders: "items",
    }),
    ...mapState("data/connections", { connectionConfigs: "items" }),
    sortedConnections() {
      let result = [];
      if (this.sort.field === "labelColor") {
        const mappings = {
          default: -1,
          red: 0,
          orange: 1,
          yellow: 2,
          green: 3,
          blue: 4,
          purple: 5,
          pink: 6,
        };
        result = _.orderBy(
          this.connectionConfigs,
          (c) => mappings[c.labelColor]
        );
      } else {
        result = _.orderBy(this.connectionConfigs, this.sort.field);
      }

      if (this.sort.order == "desc") result = result.reverse();
      return result;
    },
  },
  watch: {
    folders: {
      async handler() {
        // Should run only when moving items
        if (!this.movingItem) return;

        const newFolder = this.folders.find((folder: Folder) =>
          folder.items.find((item) => item === this.movingItem)
        );

        if (!newFolder) return;

        const connection = this.movingItem;

        // IMPORTANT: nullening before dispatching saveConnection to prevent looping
        this.movingItem = null;

        connection.connectionFolderId = newFolder.id;

        this.$store.dispatch("saveConnection", connection);
      },
      deep: true,
    },
  },
  methods: {
    async refresh() {
      const updatedFolders: Folder[] = [];
      const rootFolder: Folder = {
        id: null,
        name: "",
        description: "",
        items: [],
      };

      for (const folder of this.connectionFolders) {
        updatedFolders.push({
          id: folder.id,
          name: folder.name,
          description: folder.description,
          entity: folder,
          items: [],
        });
      }

      for (const connection of this.sortedConnections) {
        if (!connection.connectionFolderId) {
          rootFolder.items.push(connection);
        } else {
          const folder = updatedFolders.find(
            (f) => f.id === connection.connectionFolderId
          );
          folder.items.push(connection);
        }
      }

      updatedFolders.push(rootFolder);

      this.folders = updatedFolders;
    },
    handleStartMoving(event: any, fromFolder: Folder) {
      const index = event.oldIndex;
      this.movingItem = fromFolder.items[index];
    },
    handleFolderContextmenu(event: any, folder: Folder) {
      this.$bks.openMenu({
        item: folder,
        options: [
          {
            name: "Rename",
            slug: "",
            handler: async () => {
              const { canceled, value } = await this.$prompt({
                title: "Rename a folder",
                initialValue: folder.name,
              });

              if (canceled) return;

              await this.$store.dispatch("data/connectionFolders/update", {
                id: folder.id,
                name: value,
              });

              Vue.set(folder, "name", value);
            },
            // TODO add shortcut probably?
            // shortcut: this.ctrlOrCmd('z')
          },
          {
            name: "Remove",
            slug: "",
            handler: async () => {
              const confirmed = await this.$confirm(
                "Are you sure?",
                `This will only remove ${folder.name} folder, not its connections.`
              );

              if (!confirmed) return;

              for (const item of folder.items) {
                await this.$store.dispatch("data/connections/update", {
                  id: item.id,
                  connectionFolderId: null,
                });
              }

              await this.$store.dispatch(
                "data/connectionFolders/remove",
                folder.entity
              );

              this.refresh();
            },
            // TODO add shortcut probably?
            // shortcut: this.ctrlOrCmd('z')
          },
        ],
        event,
      });
    },
    async createFolder() {
      const { canceled, input } = await this.$prompt({
        title: "Create a new folder",
      });

      if (canceled) return;

      await this.$store.dispatch("data/connectionFolders/create", {
        name: input,
      });
      await this.$store.dispatch("data/connectionFolders/load");
      this.$refs.savedConnectionTree.refresh();
    },
    editConnection() {
      this.$emit("edit:connection", ...arguments);
    },
    removeConnection() {
      this.$emit("remove:connection", ...arguments);
    },
    duplicateConnection() {
      this.$emit("duplicate:connection", ...arguments);
    },
    doubleClickConnection() {
      this.$emit("doubleClick:connection", ...arguments);
    },
  },
});
</script>
