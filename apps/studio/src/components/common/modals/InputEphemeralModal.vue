<template>
  <portal to="modals">
    <base-modal
      :name="name"
      @before-open="beforeOpen"
      @opened="opened"
      @closed="closed"
    >
      <template #title>
        <i class="material-icons">vpn_key</i>
        Input {{ title }}
      </template>
      <form @submit.prevent="submit">
        <p>{{ description }}</p>

        <error-alert v-if="errorMessage" :error="errorMessage" />

        <slot name="input" :description="description" :title="title">
          <div class="form-group">
            <label for="input-ephemeral">{{ title }}</label>
            <input
              id="input-ephemeral"
              ref="valueInput"
              class="form-control"
              v-model.trim="value"
              :placeholder="`Input a ${title}`"
            >
          </div>
        </slot>
      </form>
      <template #footer>
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
      </template>
    </base-modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import ErrorAlert from "@/components/common/ErrorAlert.vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";

export default Vue.extend({
  components: { ErrorAlert, BaseModal },
  props: {
    name: String
  },
  data() {
    return {
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
      this.$modal.hide(this.name);
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

<style scoped>
p {
  margin-top: 0;
  margin-bottom: 0.25rem;
}
</style>
