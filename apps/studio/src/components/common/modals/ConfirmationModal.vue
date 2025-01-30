<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal confirmation-modal"
      :name="id"
      @opened="opened"
      @before-close="beforeClose"
    >
      <div v-kbd-trap="true">
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
            class="btn btn-flat"
            type="button"
            ref="cancelBtn"
            autofocus
            @click.prevent="cancel"
          >
            <slot name="cancel-label">
              Cancel
            </slot>
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click.prevent="confirm"
          >
            <slot name="confirm-label">
              Confirm
            </slot>
          </button>
        </div>
      </div>
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
    beforeClose(e: { params?: boolean }) {
      const event: ModalCloseEventData = {
        modalId: this.id,
        confirmed: e.params ?? false,
      };
      this.trigger(MODAL_CLOSE_EVENT, event);
    },
    confirm() {
      this.$modal.hide(this.id, true);
    },
    cancel() {
      this.$modal.hide(this.id, false);
    },
  },
  mounted() {
    if (!this.id) {
      throw new Error("No id provided for ConfirmationModal.");
    }
  },
});
</script>
