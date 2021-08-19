<template>
  <div :class="`sidebar-workspace flex-col expand ${isEmpty}`">
    <div
      class="sidebar-list"
      v-if="workspaces.length > 0"
      @contextmenu.self="rootLevel"
    >
      <nav class="list-group">
        <workspace-list-item
          v-for="workspace in workspaces"
          :key="workspace.id"
          :workspace="workspace"
          @isNotRootLevel="isNotRootLevel"
        ></workspace-list-item>
        <NodeActions
          v-show="state.creationTrigger"
          :placeholder="nodeData.placeholder"
          :type="nodeData.actionType"
          :currentDir="currentDir"
          @close="close"
          @createWorkspace="createWorkspace"
        ></NodeActions>
      </nav>
    </div>

    <x-contextmenu v-show="rootLevelCreation">
      <x-menu>
        <x-menuitem @click="createState">
          <x-label>Create Workspace</x-label>
        </x-menuitem>
      </x-menu>
    </x-contextmenu>

    <div class="empty" v-if="workspaces.length === 0">
      <span>No Workspaces found</span>
      <br />
      <span class="text-info align" @click="create"
        >Create Workspace
        <i class="item-icon material-icons left-margin">widgets</i></span
      >
    </div>

    <!-- workspace-create-modal -->
    <modal
      class="vue-dialog beekeeper-modal shorter-width"
      name="workspace-create-modal"
      @opened="selectTitleInput"
      height="auto"
      :scrollable="true"
    >
      <form @submit.prevent="create" v-hotkey="keymap">
        <div class="dialog-content">
          <div class="dialog-c-title">Workspace name</div>
          <div class="modal-form">
            <div class="alert alert-danger save-errors" v-if="error">
              {{ saveError }}
            </div>
            <div class="form-group">
              <input
                type="text"
                ref="titleInput"
                name="title"
                class="form-control"
                placeholder="Your workpsace name"
                v-model="title"
                autofocus
              />
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-flat" type="button" @click.prevent="cancel">
            Cancel
          </button>
          <button class="btn btn-primary" type="submit">
            Create
          </button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script>
import { Directory } from "@/common/appdb/models/directory";
import WorkspaceListItem from "./explorer_list/WorkspaceListItem.vue";
import NodeActions from "./explorer_list/node_actions/NodeActions.vue";
import node_actions_data from "@/mixins/explorer/node_actions_integration";
export default {
  components: { WorkspaceListItem, NodeActions },
  mixins: [node_actions_data],
  data() {
    return {
      title: "",
      error: false,
      validation: this.$store.getters.explorerValidation,
      rootBindings: [
        { event: "refreshWorkspace", handler: this.refreshWorkspace },
        { event: "createWorkspace", handler: this.refreshWorkspace }
      ],
      rootLevelCreation: true
    };
  },

  mounted() {
    this.registerHandlers(this.rootBindings);
  },

  // maybe do not9 let it go
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },

  computed: {
    workspaces() {
      return this.$store.getters.allWorkspaces;
    },

    isEmpty() {
      if (this.workspaces.length <= 0) {
        return "center-empty";
      } else {
        return "";
      }
    },

    keymap() {
      return {
        esc: this.cancel
      };
    }
  },

  methods: {
    async create() {
      const reg = new RegExp(this.validation.dir);

      if (this.title === "") {
        this.$modal.show("workspace-create-modal");
      } else if (reg.test(this.title)) {
        this.createWorkspace(this.title);
        this.cancel();
      }
    },

    async createWorkspace(title) {
      const workspace = new Directory();
      workspace.title = title || this.title;
      workspace.deepth = 0;
      workspace.isWorkspace = 1;
      await this.$store.dispatch("createWorkspace", workspace);
      setTimeout(() => {
        this.refreshWorkspace();
      }, 1);
    },

    cancel() {
      this.$modal.hide("workspace-create-modal");
      this.title = "";
    },

    async remove(workspace) {
      await this.$store.dispatch("removeWorkspace", workspace);
    },

    selectTitleInput() {
      this.$refs.titleInput.select();
    },

    async refreshWorkspace() {
      await this.$store.dispatch("fetchWorkspaces");
      console.log(this.workspaces, this.$store.getters.allWorkspaces);
    },

    createState() {
      this.nodeData.actionType = "workspace";

      setTimeout(() => {
        this.nodeData.placeholder = "Workspacename";
        this.state.creationTrigger = true;
      }, 1);
    },

    rootLevel() {
      this.rootLevelCreation = true;
    },

    isNotRootLevel() {
      this.rootLevelCreation = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.center-empty {
  display: grid;
  justify-content: center;
  align-items: center;
}

.align {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.left-margin {
  margin-left: 5px;
}

.shoter-widht {
  width: 300px !important;
}
</style>
