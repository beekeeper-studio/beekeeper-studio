<template>
  <base-modal
    :name="id"
    @submit="confirm"
    @closed="reportClose(false)"
  >
    <template #title>
      <slot name="title">Are you sure?</slot>
    </template>
    <slot name="message">This action cannot be undone.</slot>
    <template #footer>
      <button class="btn btn-flat" type="button" @click.prevent="cancel">
        <slot name="cancel-label">Cancel</slot>
      </button>
      <button class="btn btn-primary" type="submit" :data-variant="variant">
        <slot name="confirm-label">Confirm</slot>
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import {
  MODAL_CLOSE_EVENT,
  ModalCloseEventData,
} from "@/components/common/modals/utils";
import BaseModal from "@/components/common/modals/BaseModal.vue";

export default Vue.extend({
  components: { BaseModal },
  props: {
    id: {
      type: String,
      required: true,
    },
    variant: {
      type: String as PropType<"normal" | "danger">,
      default: "normal",
    },
  },
  methods: {
    /**
     * Whoever opened this modal is likely awaiting a promise that only settles
     * on this event, so every way out has to report an outcome - including the
     * ones we don't control (the header close button, Escape, clicking the
     * overlay), which only reach us as `closed`. `closed` also fires after an
     * explicit confirm/cancel; the manager ignores the second report.
     */
    reportClose(confirmed: boolean) {
      this.trigger(MODAL_CLOSE_EVENT, {
        modalId: this.id,
        confirmed,
      } as ModalCloseEventData);
    },
    confirm() {
      this.reportClose(true);
      this.$modal.hide(this.id);
    },
    cancel() {
      this.reportClose(false);
      this.$modal.hide(this.id);
    },
  },
  mounted() {
    if (!this.id) {
      throw new Error("No id provided for ConfirmationModal.");
    }
  },
});
</script>

<style scoped>
.btn[data-variant=danger] {
  background-color: var(--brand-danger);
  color: white;
}
</style>
