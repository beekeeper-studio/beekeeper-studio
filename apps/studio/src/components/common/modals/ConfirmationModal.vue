<template>
  <base-modal :name="id" @submit="confirm">
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
    confirm() {
      this.trigger(MODAL_CLOSE_EVENT, {
        modalId: this.id,
        confirmed: true,
      } as ModalCloseEventData);

      this.$modal.hide(this.id);
    },
    cancel() {
      this.trigger(MODAL_CLOSE_EVENT, {
        modalId: this.id,
        confirmed: false,
      } as ModalCloseEventData);

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
