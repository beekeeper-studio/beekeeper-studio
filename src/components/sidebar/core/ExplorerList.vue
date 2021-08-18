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
            <a title="'Refresh'" @click="refresh">
              <i class="material-icons">refresh</i>
            </a>
          </div>
        </div>

        <div class="list-body" @contextmenu.self="rootLevel">
          <x-contextmenu v-if="rootLevelCreation">
            <x-menu>
              <x-menuitem @click.prevent="createState('dir')">
                <x-label>New Folder</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="createState('file')">
                <x-label>New File</x-label>
              </x-menuitem>
            </x-menu>
          </x-contextmenu>

          <div class="with-schemas">
            <div class="schema-wrapper">
              <explorer-list-dir
                v-for="dir in directories"
                :key="dir.title"
                :node="dir"
                :depth="0"
              ></explorer-list-dir>

              <explorer-list-file
                v-for="query in queries"
                :key="query.name"
                :query="query"
                :currentNode="currentNode"
                :currentParentNode="currentParentNode"
                @select="selectQuery"
              ></explorer-list-file>
            </div>
          </div>

          <NodeActions
            v-show="state.creationTrigger"
            :placeholder="nodeData.placeholder"
            :type="nodeData.actionType"
            :currentDir="currentDir"
            @close="close"
          ></NodeActions>
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
import WorkspaceList from "./explorer_list/WorkspaceList.vue";
import ExplorerListDir from "./explorer_list/ExplorerListDir.vue";
import ExplorerListFile from "./explorer_list/ExplorerListFile.vue";
import NodeActions from "./explorer_list/node_actions/NodeActions.vue";
import { Directory } from "@/common/appdb/models/directory";
import { uuidv4 } from "@/lib/uuid";
import explorer_actions from "@/mixins/explorer_actions";
const tree = require("../../../plugins/TreePlugin");
export default {
  components: {
    WorkspaceList,
    ExplorerListDir,
    ExplorerListFile,
    NodeActions
  },
  mixins: [explorer_actions],

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
      rootLevelCreation: true,
      rootBindings: [
        { event: "refreshExplorer", handler: this.refresh },
        { event: "createWorkspace", handler: this.createWorkspace },
        { event: "selectWorkspace", handler: this.selectWorkspace },
        { event: "createTree", handler: this.createNode },
        { event: "isNotRootLevel", handler: this.isNotRootLevel }
      ]
    };
  },

  computed: {
    directories() {
      const dirArr = this.explorer.tree.children.filter(element => {
        if (element.type === "dir") {
          return element;
        }
      });

      return dirArr;
    },

    queries() {
      const queriesArr = this.explorer.tree.children.filter(element => {
        if (element.usage === "query") {
          return element;
        }
      });
      return queriesArr;
    },
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
    },

    rootLevel() {
      this.rootLevelCreation = true;
    },

    isNotRootLevel() {
      this.rootLevelCreation = false;
    },

    createState(actionType) {
      this.nodeData.actionType = actionType;
      this.
      setTimeout(() => {
        switch (actionType) {
          case "dir":
            this.nodeData.placeholder = "Foldername";
            this.state.creationTrigger = true;
            break;
          case "file":
            this.nodeData.placeholder = "Filename";
            this.state.creationTrigger = true;
            break;
        }
      }, 1);
    }
  }
};
</script>

<style lang="scss" scoped></style>
