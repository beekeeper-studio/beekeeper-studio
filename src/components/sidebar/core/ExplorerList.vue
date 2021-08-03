<template>
  <div class="flex-col expand" ref="wrapper">
    <!-- Fake splitjs Gutter styling -->
    <div v-if="explorer.selected" class="table-list flex-col" ref="tables">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div>
              {{ rootDirName }}
            </div>
          </div>
          <div class="actions">
            <a @click.prevent="collapseAll" title="'Collapse All'">
              <i class="material-icons">unfold_less</i>
            </a>
            <a title="New Folder">
              <i class="material-icons">create_new_folder</i>
            </a>
            <a title="New File">
              <i class="material-icons">add</i>
            </a>
            <a title="'Refresh'" @click.prevent="refreshExplorer">
              <i class="material-icons">refresh</i>
            </a>
          </div>
        </div>

        <div class="list-body" ref="entityContainer">
          <div class="with-schemas">
            <explorer-list-schema
              v-show="explorer.selected"
              :tree="explorer.tree"
            >
            </explorer-list-schema>
          </div>
        </div>
      </nav>
    </div>

    <div class="empty" v-if="explorer.tree.length === 0">
      <button @click="selectWorkspace">
        Workspace <i class="schema-icon material-icons">drive_folder_upload</i>
      </button>
    </div>
  </div>
</template>

<script>
import ExplorerListSchema from "./explorer_list/ExplorerListSchema.vue";
import { Workspace } from "../../../common/appdb/models/workspace";
const folderTree = require("../../../plugins/foldertree");
export default {
  components: {
    ExplorerListSchema
  },

  mounted() {
    this.registerHandlers(this.rootBindings);
  },

  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },

  data() {
    return {
      explorer: {
        rootPath: this.$store.getters.selectedPath || "",
        tree: [],
        selected: false
      },
      rootBindings: [
        { event: "refreshExplorer", handler: this.refreshExplorer }
      ]
    };
  },

  computed: {
    rootDirName() {
      const nameArr = this.explorer.rootPath.split("\\");
      return nameArr[nameArr.length - 1];
    }
  },

  methods: {
    async selectWorkspace() {
      const space = new Workspace();
      space.name = "nahhh";
      space.database = "nahhahahha";
      await space.save(space);
    },

    expandAll() {
      this.allExpanded = Date.now();
    },
    collapseAll() {
      this.allCollapsed = Date.now();
    },
    refreshExplorer() {
      this.createTree();
    },

    createTree(path, options) {
      const finalPath = path || this.explorer.rootPath;
      const tree = folderTree.buildTree(finalPath, options);
      this.explorer.tree = tree;
      return tree;
    }
  }
};
</script>

<style lang="scss" scoped></style>
