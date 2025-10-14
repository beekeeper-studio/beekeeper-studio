<template>
  <modal
    :name="modalName"
    class="vue-dialog beekeeper-modal create-workspace-modal"
    @opened="focus"
  >
    <form @submit.prevent="submit">
      <div class="dialog-content">
        <div class="dialog-c-title">
          Rename Workspace
        </div>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="account">Account</label>
          <input name="account" id="account" :value="account" disabled>
        </div>
        <div class="form-group">
          <label for="workspace-name">Workspace Name</label>
          <input id="workspace-name" name="workspace-name" v-model="workspaceName" type="text" ref="nameInput" placeholder="e.g. Matthew's Workspace">
        </div>
      </div>
      <div class="vue-dialog-buttons flex-between">
        <span class="left" />
        <span class="right">
          <button class="btn btn-flat" type="button" @click.prevent="close">
            Cancel
          </button>
          <button class="btn btn-primary" :disabled="loading" type="submit">
            {{ loading ? "..." : "Rename Workspace" }}
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
      modalName: "rename-workspace",
      workspaceName: "",
      workspace: null,
      client: null,
      account: "",
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
      return [{ event: AppEvent.promptRenameWorkspace, handler: this.open }];
    },
  },
  methods: {
    focus() {
      this.$refs.nameInput.focus();
    },
    open({ workspace, client }) {
      this.workspace = workspace
      this.workspaceName = workspace.name;
      this.client = client;
      this.account = client.options.email;
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    async submit() {
      try {
        this.error = null;
        this.loading = true;
        await this.$store.dispatch("credentials/renameWorkspace", {
          client: this.client,
          workspace: this.workspace,
          name: this.workspaceName,
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
