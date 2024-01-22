<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal confirmation-modal"
      :name="name"
      @before-open="beforeOpen"
      @before-close="beforeClose"
    >
      <div class="dialog-content">
        <slot name="title">
          <div class="dialog-c-title" v-html="titleHtml"></div>
        </slot>
        <slot name="message">
          <div v-html="messageHtml"></div>
        </slot>
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
          @click.prevent="onClickConfirm"
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
  props: ['name'],
  data() {
    return {
      onConfirm: null,
      onCancel: null,
      titleHtml: "",
      messageHtml: "",
    };
  },
  methods: {
    beforeOpen(event: any) {
      this.onConfirm = event.params?.onConfirm;
      this.onCancel = event.params?.onCancel;
      this.titleHtml = event.params?.title || DEFAULT_TITLE;
      this.messageHtml = event.params?.message || DEFAULT_MESSAGE;
    },
    onClickConfirm() {
      this.$modal.hide(this.name, { confirmed: true });
    },
    cancel() {
      this.$modal.hide(this.name, { confirmed: false });
    },
    beforeClose(event: any) {
      if (event.params.confirmed) this.onConfirm?.();
      else this.onCancel?.();
    },
    confirm(title?: string, message?: string) {
      return new Promise<boolean>((resolve, reject) => {
        try {
          this.$modal.show(this.name, {
            title,
            message,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          });
        } catch (e) {
          reject(e);
        }
      });
    },
  },
  mounted() {
    if (!this.name) {
      console.warn("No name provided for ConfirmationModal.");
    }
  },
});
</script>
