<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal confirmation-modal"
      :name="name"
      @before-open="beforeOpen"
      @before-close="beforeClose"
      @opened="opened"
    >
      <div class="dialog-content">
        <slot name="title">
          <div
            class="dialog-c-title"
            v-html="titleHtml"
          />
        </slot>
        <input
          v-model="value"
          :placeholder="placeholder"
          ref="inputRef"
          @keyup.enter="handleConfirm"
        >
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="cancel"
        >
          {{ cancelText }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { PromptOptions } from "@/plugins/BeekeeperPlugin";

const DEFAULT_TITLE = "Please enter your text";
const DEFAULT_PLACEHOLDER = "";
const DEFAULT_CONFIRM_TEXT = "Confirm";
const DEFAULT_CANCEL_TEXT = "Cancel";

export default Vue.extend({
  props: ["name"],
  data() {
    return {
      onConfirm: null,
      onCancel: null,
      titleHtml: "",
      value: "",
      placeholder: "",
      confirmText: "",
      cancelText: "",
    };
  },
  methods: {
    beforeOpen(event: any) {
      this.onConfirm = event.params.onConfirm;
      this.onCancel = event.params.onCancel;
      this.titleHtml = event.params.title || DEFAULT_TITLE;
      this.placeholder = event.params.placeholder || DEFAULT_PLACEHOLDER;
      this.confirmText = event.params.confirmText || DEFAULT_CONFIRM_TEXT;
      this.cancelText = event.params.cancelText || DEFAULT_CANCEL_TEXT;
      this.value = event.params.initialValue || "";
    },
    opened() {
      this.$refs.inputRef.focus();
    },
    handleConfirm() {
      this.$modal.hide(this.name, { confirmed: true });
    },
    cancel() {
      this.$modal.hide(this.name, { confirmed: false });
    },
    beforeClose(event: any) {
      if (event.params?.confirmed) {
        this.onConfirm?.({ canceled: false, value: this.value });
      } else {
        this.onCancel?.({ canceled: true, value: this.value });
      }
    },
    async prompt(options?: PromptOptions) {
      return await this.$prompt(options, this.name);
    },
  },
});
</script>
