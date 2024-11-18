<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal confirmation-modal"
      :name="id"
      @opened="opened"
      @before-close="beforeClose"
    >
      <form v-kbd-trap="true" @submit.prevent="submit" ref="form">
        <div class="dialog-content">
          <div class="dialog-c-title">
            <slot name="title">
              Are you sure?
            </slot>
          </div>
          <slot name="message">
            <div>This action cannot be undone.</div>
          </slot>
        </div>
        <div class="vue-dialog-buttons">
          <button
            name="intent"
            value="cancel"
            class="btn btn-flat"
            ref="cancelBtn"
            autofocus
          >
            <slot name="cancel-label">
              Cancel
            </slot>
          </button>
          <button
            name="intent"
            value="submit"
            class="btn btn-primary"
          >
            <slot name="confirm-label">
              Confirm
            </slot>
          </button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { MODAL_CLOSE_EVENT, ModalCloseEventData } from "@/components/common/modals/utils";

export default Vue.extend({
  props: ['id'],
  methods: {
    opened() {
      this.$refs.cancelBtn.focus()
    },
    beforeClose(e: { params?: FormData }) {
      const event: ModalCloseEventData = {
        modalId: this.id,
        formData: e.params,
      };
      this.trigger(MODAL_CLOSE_EVENT, event);
    },
    submit(event: SubmitEvent) {
      // We don't want to submit by pressing enter on an input element.
      // This causes the submitter to always pick the first submit element
      if (event.submitter !== document.activeElement) {
        return
      }
      // @ts-expect-error FormData can accept 2 arguments
      const formData = new FormData(event.target, event.submitter);
      this.$modal.hide(this.id, formData);
    },
  },
  mounted() {
    if (!this.id) {
      throw new Error("No id provided for ConfirmationModal.");
    }
  },
});
</script>
