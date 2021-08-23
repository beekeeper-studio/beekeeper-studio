<template>
  <div
    class="sidebar-workspace flex-col expand"
    v-hotkey="keymap"
    style="position:relative;"
  >
    <nav class="list-group flex-col">
      <div class="list-heading row">
        <div class="sub row flex-middle expand">
          <a style="display:flex; align-items:flex-end;">
            <span>
              Workspaces
            </span>
          </a>
        </div>
        <div class="actions">
          <a title="Refresh" @click="refreshWorkspace(true)">
            <i class="material-icons">refresh</i>
          </a>
        </div>
      </div>

      <hr style="margin-top: 5px;" />

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
            v-show="state.creationTrigger && workspaces.length > 0"
            :placeholder="nodeData.placeholder"
            :type="nodeData.actionType"
            :currentDir="currentDir"
            @close="defaultCreationClose"
            @createWorkspace="createWorkspace"
          ></NodeActions>
        </nav>
      </div>

      <x-contextmenu v-if="rootLevelCreation && workspaces.length > 0">
        <x-menu>
          <x-menuitem @click="createState">
            <x-label>Create Workspace</x-label>
            <x-shortcut value="Control+N"></x-shortcut>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </nav>

    <div class="empty center-empty" v-if="workspaces.length === 0">
      <span>No Workspaces found</span>
      <br />
      <span class="text-info align" @click="create">
        <i class="item-icon material-icons right-margin">widgets</i>
        Create Workspace
      </span>
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
          <div class="dialog-c-title">Name</div>
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
import WorkspaceListItem from "./explorer_list/workspace/WorkspaceListItem.vue";
import NodeActions from "./explorer_list/node_actions/NodeActions.vue";
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
export default {
  components: { WorkspaceListItem, NodeActions },
  mixins: [node_actions_integration],
  data() {
    return {
      title: "",
      error: false,
      validation: this.$store.getters.allValidation.dir,
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
        esc: this.cancel,
        "ctrl+n": this.createState
      };
    }
  },

  methods: {
    async create() {
      if (this.title === "") {
        this.$modal.show("workspace-create-modal");
      } else if (this.validation.test(this.title)) {
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
        this.refreshWorkspace(false);
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

    async refreshWorkspace(buttonTrigger) {
      if (buttonTrigger) this.$noty.info("Successfully refreshed workspace.");
      await this.$store.dispatch("fetchWorkspaces");
    },

    createState() {
      this.nodeData.actionType = "workspace";

      this.$nextTick(() => {
        this.nodeData.placeholder = "Workspacename";
        this.state.creationTrigger = true;
      });
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
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  width: 100%;
  justify-content: center;
  align-items: center;
}

.align {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.right-margin {
  margin-right: 5px;
}

.shoter-widht {
  width: 300px !important;
}
</style>
