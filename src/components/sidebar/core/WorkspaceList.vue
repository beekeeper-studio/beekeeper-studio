<template>
  <div :class="`sidebar-workspace flex-col expand ${isEmpty}`">
    <div class="sidebar-list" v-if="workspaces.length > 0">
      <nav class="list-group">
        <workspace-list-item
          v-for="workspace in workspaces"
          :key="workspace.id"
          :workspace="workspace"
        ></workspace-list-item>
      </nav>
    </div>

    <x-contextmenu>
      <x-menu>
        <x-menuitem>
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
  </div>
</template>

<script>
import { Directory } from "@/common/appdb/models/directory";
import WorkspaceListItem from "./explorer_list/WorkspaceListItem.vue";
export default {
  components: { WorkspaceListItem },
  data() {
    return {
      title: "",
      error: false,
      validation: this.$store.getters.explorerValidation,
      noElement: true
    };
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
      }
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

    refreshWorkspace() {},

    async createWorkspace(title = `Workspace${this.workspaces.length + 1}`) {
      const workspace = new Directory();
      workspace.title = title;
      workspace.deepth = 0;
      workspace.isWorkspace = 1;
      await this.$store.dispatch("createWorkspace", workspace);
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
