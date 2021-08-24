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
            <a style="display:flex; align-items:flex-end;">
              <i class="material-icons item-icon">widgets</i>

              <span class="workspace-name">
                {{ workspaceName }}
              </span>
            </a>
          </div>
          <div class="actions">
            <a title="Refresh" @click="refresh(true)">
              <i class="material-icons">refresh</i>
            </a>
            <a title="Back to workspaces list" @click="backToWorkspace">
              <i class="material-icons">view_list</i>
            </a>
          </div>
        </div>

        <hr style="margin-top:5px;" />

        <div class="list-body" @contextmenu.self="rootLevel" ref="contextmenu">
          <!-- // TODO fix that it shows up where the mouse is -->
          <x-contextmenu v-show="rootLevelCreation">
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
                @select="selectQuery"
              ></explorer-list-file>
            </div>
          </div>

          <NodeActions
            v-show="state.creationTrigger"
            :placeholder="nodeData.placeholder"
            :type="nodeData.actionType"
            :currentDir="currentDir"
            @close="defaultCreationClose"
            @createFile="saveQuery"
            @createDirectory="createDirectory"
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
import WorkspaceList from "./WorkspaceList.vue";
import ExplorerListDir from "./explorer_list/ExplorerListDir.vue";
import ExplorerListFile from "./explorer_list/ExplorerListFile.vue";
import NodeActions from "./explorer_list/node_actions/NodeActions.vue";
import { Directory } from "@/common/appdb/models/directory";
import { FavoriteQuery } from "@/common/appdb/models/favorite_query";
import { uuidv4 } from "@/lib/uuid";
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
import select_system from "@/mixins/explorer/select_system";
import rename_integration from "@/mixins/explorer/rename_integration";
const tree = require("../../../plugins/ExplorerPlugin");
export default {
  components: {
    WorkspaceList,
    ExplorerListDir,
    ExplorerListFile,
    NodeActions
  },
  mixins: [node_actions_integration, select_system, rename_integration],

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
        { event: "selectWorkspace", handler: this.selectWorkspace },
        { event: "createTree", handler: this.createNode },
        { event: "isNotRootLevel", handler: this.isNotRootLevel },
        { event: "createDirectory", handler: this.createDirectory },
        { event: "saveQuery", handler: this.saveQuery }
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
    async backToWorkspace() {
      this.explorer = {
        workspaceSelected: false,
        tree: null
      };
      this.rootLevelCreation = true;
      await this.$store.dispatch("setWorkspace", null);
    },

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

    async refresh(buttonTrigger) {
      if (buttonTrigger) this.$noty.info("Explorer refreshed");

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
      this.setDir();
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
    },

    async saveQuery(title) {
      const query = new FavoriteQuery();
      query.title = title || this.onlyTitle;
      query.directory_id = this.currentDir.node.id;
      query.text = "";
      await this.$store.dispatch("saveFavorite", query);
      setTimeout(() => {
        this.refresh(false);
      }, 1);
    },

    async createDirectory(title) {
      const currentworkspace = this.$store.getters.currentWorkspace.node;
      const dir = new Directory();
      dir.title = title || this.title;
      dir.workspace_id = currentworkspace.id;
      dir.parent_id = this.currentDir.node.id;
      dir.deepth = this.currentDir.node.deepth + 1;
      dir.isWorkspace = 0;
      await this.$store.dispatch("createDirectory", dir);
      setTimeout(() => {
        this.refresh(false);
      }, 1);
    }
  }
};
</script>

<style lang="scss" scoped></style>
