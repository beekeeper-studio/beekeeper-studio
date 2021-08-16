<template>
  <div class="flex-col expand" ref="wrapper">
    <!-- Fake splitjs Gutter styling -->
    <div
      v-if="explorer.workspaceSelected"
      class="table-list flex-col"
      ref="tables"
    >
      <nav class="list-group flex-col">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div>
              {{ workspaceName }}
            </div>
          </div>
          <div class="actions">
            <!-- <a @click.prevent="collapseAll" title="'Collapse All'">
              <i class="material-icons">unfold_less</i>
            </a>
            <a title="New Folder">
              <i class="material-icons">create_new_folder</i>
            </a>
            <a title="New File">
              <i class="material-icons">add</i>
            </a> -->
            <a title="'Refresh'" @click="refresh">
              <i class="material-icons">refresh</i>
            </a>
          </div>
        </div>

        <div class="list-body">
          <div class="with-schemas">
            <explorer-list-schema :tree="tree"> </explorer-list-schema>
          </div>
        </div>
      </nav>
    </div>

    <WorkspaceList
      @select="selectWorkspace"
      v-if="!explorer.workspaceSelected"
    ></WorkspaceList>
  </div>
</template>

<script>
import ExplorerListSchema from "./explorer_list/ExplorerListSchema.vue";
import WorkspaceList from "./WorkspaceList.vue";
import { Directory } from "@/common/appdb/models/directory";
import { uuidv4 } from "@/lib/uuid";
const tree = require("../../../plugins/TreePlugin");
export default {
  components: {
    ExplorerListSchema,
    WorkspaceList
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
        workspaceSelected: false,
        tree: null
      },
      rootBindings: [{ event: "refreshExplorer", handler: this.refresh }]
    };
  },

  computed: {
    workspaceName() {
      return this.$store.getters.currentWorkspace.node.title;
    },

    tree() {
      return this.explorer.tree;
    }
  },

  methods: {
    async selectWorkspace(workspace) {
      await this.$store.dispatch("setWorkspace", workspace);
      await this.$store.dispatch("fetchDirectories", workspace);
      await this.$store.dispatch("fetchQueries", workspace);
      setTimeout(async () => {
        const dir = this.$store.getters.allDirectories;
        const queries = this.$store.getters.allQueries;
        const root = this.createTree(workspace, dir, queries);
        await this.$store.dispatch("setWorkspace", root);
        this.explorer.tree = root;
        this.explorer.workspaceSelected = true;
      }, 1); // 1ms delay is needed to get the value from the store otherwise its null
    },

    createTree(workspace = null, dir = null, queries = null) {
      const d = dir || this.$store.getters.allDirectories;
      const q = queries || this.$store.getters.allQueries;
      const root = this.$createTree(workspace, d, q);
      return root;
    },

    async refresh(buttonTrigger = null) {
      if (buttonTrigger !== null) this.$noty.info("Explorer refreshed");

      const workspace = this.$store.getters.currentWorkspace.node;
      await this.$store.dispatch("fetchQueries", workspace);
      await this.$store.dispatch("fetchDirectories", workspace);
      setTimeout(() => {
        const root = this.createTree(workspace);
        this.explorer.tree = root;
      }, 2);
    }
  }
};
</script>

<style lang="scss" scoped></style>
