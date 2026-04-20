<template>
  <portal to="modals">
    <modal
      :name="modalName"
      @before-open="beforeOpen"
      @opened="opened"
      @closed="closed"
      class="vue-dialog beekeeper-modal"
    >
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title has-icon">
            <i class="material-icons">vpn_key</i>
            Paste CockroachDB JWT
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <div class="description">
            <p>{{ description }}</p>
          </div>

          <error-alert v-if="errorMessage" :error="errorMessage" />

          <div class="form-group">
            <label for="input-jwt">JWT Token</label>
            <textarea
              id="input-jwt"
              ref="tokenInput"
              class="form-control"
              v-model.trim="token"
              rows="5"
              spellcheck="false"
              placeholder="Paste a fresh CockroachDB JWT"
            />
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat btn-cancel"
            type="button"
            @click.prevent="close"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            @click.prevent="submit"
            :disabled="submitting"
          >
            Connect
          </button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";

export default Vue.extend({
  components: { ErrorAlert },
  data() {
    return {
      modalName: "input-jwt-modal",
      submitListener: (_token: string) => {},
      cancelListener: () => {},
      submitting: false,
      token: "",
      errorMessage: "",
      description: "Paste a fresh CockroachDB JWT. Beekeeper will send it as the password for this connection.",
    };
  },
  methods: {
    beforeOpen(event) {
      const params = event.params || {};
      this.submitListener = params.onSubmit || (() => {});
      this.cancelListener = params.onCancel || (() => {});
      this.submitting = false;
      this.token = "";
      this.errorMessage = "";
      this.description = params.description || "Paste a fresh CockroachDB JWT. Beekeeper will send it as the password for this connection.";
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.tokenInput.focus();
      });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    submit() {
      if (!this.token) {
        this.errorMessage = "A JWT token is required to connect";
        return;
      }

      this.submitting = true;
      this.errorMessage = "";
      this.close();
    },
    closed() {
      if (this.submitting) {
        this.submitListener(this.token);
      } else {
        this.cancelListener();
      }
    },
  },
});
</script>
