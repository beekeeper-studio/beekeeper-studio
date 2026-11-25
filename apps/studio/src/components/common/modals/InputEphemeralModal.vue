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
        {{ modalTitle || `Input ${title}` }}
      </template>
      <form @submit.prevent="submit">
        <p>{{ description }}</p>

        <error-alert v-if="errorMessage" :error="errorMessage" />

        <slot name="input" :description="description" :title="title">
          <div :class="['form-group', inputType === 'password' ? 'form-group-password' : '']">
            <label for="input-ephemeral">{{ title }}</label>
            <input
              id="input-ephemeral"
              ref="valueInput"
              class="form-control"
              :type="inputType === 'password' && !showPassword ? 'password' : 'text'"
              v-model.trim="value"
              :placeholder="placeholder || `Input a ${title}`"
            >
            <i
              v-if="inputType === 'password'"
              class="material-icons password-icon"
              @click="togglePasswordVisibility"
              :title="showPassword ? 'Hide password' : 'Show password'"
            >
              {{ showPassword ? "visibility_off" : "visibility" }}
            </i>
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
          {{ buttonLabel || 'Connect' }}
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
      title: null,
      modalTitle: null,
      placeholder: null,
      buttonLabel: null,
      inputType: 'text',
      showPassword: false,
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
      this.title = params.title || "Value";
      this.modalTitle = params.modalTitle || null;
      this.placeholder = params.placeholder || null;
      this.buttonLabel = params.buttonLabel || null;
      this.inputType = params.inputType || 'text';
      this.showPassword = false;
    },
    opened() {
      this.$nextTick(() => {
        this.$refs.valueInput.focus();
      });
    },
    close() {
      this.$modal.hide(this.name);
    },
    togglePasswordVisibility() {
      this.showPassword = !this.showPassword;
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
.password-icon {
  cursor: pointer;
  user-select: none;
}
</style>
