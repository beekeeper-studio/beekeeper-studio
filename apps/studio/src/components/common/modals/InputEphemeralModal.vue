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
            Input {{ title }}
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <div class="description">
            <p>{{ description }}</p>
          </div>

          <error-alert v-if="errorMessage" :error="errorMessage" />

          <div class="form-group">
            <label for="input-ephemeral">{{ title }}</label>
            <input
              id="input-ephemeral"
              ref="valueInput"
              class="form-control"
              v-model.trim="value"
              :placeholder="`Input a ${title}`"
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
      modalName: "input-ephemeral-modal",
      submitListener: (_value: string) => {},
      cancelListener: () => {},
      submitting: false,
      value: null,
      errorMessage: null,
      description: null,
      title: null
    };
  },
  methods: {
    beforeOpen(event) {
      const params = event.params || {};
      this.submitListener = params.onSubmit || (() => {});
      this.cancelListener = params.onCancel || (() => {});
      this.submitting = false;
      this.value = null;
      this.errorMessage = null;
      this.description = params.description || "Input a new value. Beekeeper will use it to connect";
      this.title = params.title || "Value"
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.valueInput.focus();
      });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    submit() {
      if (!this.value) {
        this.errorMessage = `Please input a ${this.title ?? "value"} to connect`;
        return;
      }

      this.submitting = true;
      this.errorMessage = null;
      this.close();
    },
    closed() {
      if (this.submitting) {
        this.submitListener(this.value);
      } else {
        this.cancelListener();
      }
    },
  },
});
</script>
