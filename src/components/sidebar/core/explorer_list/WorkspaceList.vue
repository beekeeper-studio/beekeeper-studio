<template>
  <div :class="`sidebar-workspace flex-col expand ${isEmpty}`">
    <div class="sidebar-list" v-if="workspaces.length > 0">
      <nav class="list-group">
        <div
          class="list-item"
          v-for="workspace in workspaces"
          :key="workspace.id"
        >
          <a class="list-item-btn" @click="select(workspace)">
            <i class="item-icon material-icons">widgets</i>

            <div class="list-title flex-col">
              <span class="item-text expand truncate">
                {{ nicelySized(workspace.title) }}</span
              >
              <span class="subtitle"
                ><span>{{ workspace.createdAt }}</span></span
              >
            </div>
            <x-contextmenu v-if="!noElement">
              <x-menu style="--target-align: right; --v-target-align: top;">
                <x-menuitem @click="remove(workspace)">
                  <x-label class="text-danger">Remove</x-label>
                </x-menuitem>
              </x-menu>
            </x-contextmenu>
          </a>
        </div>
      </nav>
      <x-contextmenu v-if="noElement">
        <x-menu>
          <x-menuitem @click.prevent="renameState">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove(query)">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </div>

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
export default {
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
    nicelySized(text) {
      if (text.length >= 128) {
        return `${text.substring(0, 128)}...`;
      } else {
        return text;
      }
    },

    select(workspace) {
      this.$emit("select", workspace);
    },

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
