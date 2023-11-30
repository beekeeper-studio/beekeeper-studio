<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal confirmation-modal"
      :name="name"
      @before-open="beforeOpen"
      @before-close="beforeClose"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          {{ title }}
        </div>
        {{ message }}
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="cancel"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="confirm"
          autofocus
        >
          Confirm
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";

const DEFAULT_TITLE = "Are you sure?";
const DEFAULT_MESSAGE = "This action cannot be undone.";

export default Vue.extend({
  data() {
    return {
      name: Vue.prototype.$confirmModalId,
      onConfirm: null,
      onCancel: null,
      title: "",
      message: "",
    };
  },
  methods: {
    beforeOpen(event: any) {
      this.onConfirm = event.params.onConfirm;
      this.onCancel = event.params.onCancel;
      this.title = event.params.title || DEFAULT_TITLE;
      this.message = event.params.message || DEFAULT_MESSAGE;
    },
    confirm() {
      this.$modal.hide(this.name, { confirmed: true });
    },
    cancel() {
      this.$modal.hide(this.name, { confirmed: false });
    },
    beforeClose(event: any) {
      if (event.params.confirmed) this.onConfirm?.();
      else this.onCancel?.();
    },
  },
});
</script>
