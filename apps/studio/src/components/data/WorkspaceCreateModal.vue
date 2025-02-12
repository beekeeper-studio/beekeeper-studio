<template>
  <modal
    :name="modalName"
    class="vue-dialog beekeeper-modal create-workspace-modal"
    @opened="focus"
  >
    <form @submit.prevent="submit">
      <div class="dialog-content">
        <div class="dialog-c-title">
          New Workspace
        </div>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="account">Account</label>
          <select name="account" id="account" v-model="selectedBlobId" :disabled="credentials.length === 1">
            <option v-for="cred in credentials" :key="cred.id" :value="cred.id">
              {{ cred.credential.email }}
            </option>
          </select>
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
            {{ loading ? "..." : "Create Workspace" }}
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
      modalName: "create-workspace",
      workspaceName: "",
      loading: false,
      error: null,
      selectedBlobId: -1,
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
          this.selectedBlobId = this.credentials[0].id
        }
      },
    },
  },
  computed: {
    ...mapState('credentials', ['credentials']),
    rootBindings() {
      return [{ event: AppEvent.promptCreateWorkspace, handler: this.open }];
    },
  },
  methods: {
    focus() {
      this.$refs.nameInput.focus();
    },
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    async submit() {
      try {
        this.error = null;
        this.loading = true;
        await this.$store.dispatch("credentials/createWorkspace", {
          name: this.workspaceName,
          blobId: this.selectedBlobId,
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
