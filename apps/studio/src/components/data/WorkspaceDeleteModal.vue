<template>
  <modal
    :name="modalName"
    class="vue-dialog beekeeper-modal create-workspace-modal"
    @opened="focus"
  >
    <form @submit.prevent="submit">
      <div class="dialog-content">
        <div class="dialog-c-title text-danger">
          Delete Workspace
        </div>
        <p class="alert alert-danger" aria-role="alert">
          Warning: You are about to delete the workspace "{{ workspaceName }}". 
        </p>
        <p>
          This action will remove the {{ workspaceName }} workspace and all associated data which includes:
        </p>
        <ul>
          <li>
            Shared queries
          </li>
          <li>
            Shared connections
          </li>
        </ul>
        <p>All members will be notified via email.</p>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="workspace-name">
            Please type&nbsp;<strong>{{ workspaceName }}</strong>
          </label>
          <input
            id="workspace-name"
            name="workspace-name"
            v-model="workspaceToDelete"
            type="text"
            ref="nameInput"
            :placeholder="inputPlaceholder"
          >
        </div>
        <p class="alert alert-danger" aria-role="alert">
          This CANNOT be undone
        </p>
      </div>
      <div class="vue-dialog-buttons flex-between">
        <span class="left" />
        <span class="right">
          <button class="btn btn-flat" type="button" @click.prevent="close">
            Cancel
          </button>
          <button class="btn btn-danger" :disabled="!canSubmit" type="submit">
            {{ loading ? "..." : "Delete Workspace" }}
          </button>
        </span>
      </div>
    </form>
  </modal>
</template>

<script lang="ts">
import Vue from "vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import { AppEvent } from "@/common/AppEvent";
import { mapState } from "vuex";

export default Vue.extend({
  components: { ErrorAlert },
  data() {
    return {
      modalName: "delete-workspace",
      workspaceName: "",
      workspaceToDelete: '',
      workspace: null,
      client: null,
      loading: false,
      error: null,
    };
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  watch: {
    credentials: {
      immediate: true,
      handler() {
        if (this.credentials.length > 0) {
          this.selectedCredId = this.credentials[0].id
        }
      },
    },
  },
  computed: {
    ...mapState('credentials', ['credentials']),
    rootBindings() {
      return [{ event: AppEvent.promptDeleteWorkspace, handler: this.open }];
    },
    isOwner() {
      return this.workspace?.isOwner ?? false
    },
    canSubmit() {
      return !this.loading && this.workspaceName === this.workspaceToDelete && this.workspace?.isOwner
    },
    inputPlaceholder() {
      return `Type "${this.workspaceName}" to delete`
    }
  },
  methods: {
    focus() {
      this.$refs.nameInput.focus();
    },
    open({ workspace, client }) {
      this.workspace = workspace
      this.workspaceName = workspace.name;
      this.client = client;
      this.workspaceToDelete = ''
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    async submit() {
      try {
        this.error = null;
        this.loading = true;
        await this.$store.dispatch("credentials/deleteWorkspace", {
          client: this.client,
          workspaceId: this.workspace.id
        });
        this.close();
      } catch (ex) {
        this.error = ex;
      } finally {
        this.loading = false;
      }
    },
  },
});
</script>
