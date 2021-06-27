<template>
  <div class="flex-col expand" ref="wrapper">
    <!-- Fake splitjs Gutter styling -->
    <div v-if="explorer.selected" class="table-list flex-col" ref="tables">
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div>
              Testing
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
      <button @click="selectFolder">Select</button>
    </div>
  </div>
</template>

<script>
import ExplorerListSchema from "./explorer_list/ExplorerListSchema.vue";

const electron = require("electron");
const folderTree = require("../../../plugins/foldertree");
export default {
  components: {
    ExplorerListSchema
  },

  data() {
    return {
      allExpanded: null,
      allCollapsed: null,
      activeItem: "tables",
      explorer: {
        rootPath: "",
        tree: [],
        selected: false
      }
    };
  },

  computed: {},

  methods: {
    selectFolder() {
      electron.remote.dialog
        .showOpenDialog({ properties: ["openDirectory"] })
        .then(res => {
          const root = res.filePaths[0];
          this.explorer.rootPath = root;
          const tree = this.createTree(root);
          this.explorer.selected = true;
        });
    },

    tableSelected() {
      // this.selectedTable = table
    },

    expandAll() {
      this.allExpanded = Date.now();
    },
    collapseAll() {
      this.allCollapsed = Date.now();
    },
    refreshExplorer() {
      this.createTree();
      // this.$store.dispatch("updateTables");
      // this.$store.dispatch("updateRoutines");
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
