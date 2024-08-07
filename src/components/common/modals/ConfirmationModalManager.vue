<template>
  <portal to="modals">
    <template v-for="modal in modals">
      <confirmation-modal
        v-if="!modal.noDisplay"
        :id="modal.id"
        :key="modal.id"
      >
        <template v-slot:title v-if="modal.title">
          {{ modal.title }}
        </template>
        <template v-slot:message v-if="modal.message">
          {{ modal.message }}
        </template>
        <template v-slot:confirm-label v-if="modal.confirmLabel">
          {{ modal.confirmLabel }}
        </template>
        <template v-slot:cancel-label v-if="modal.cancelLabel">
          {{ modal.cancelLabel }}
        </template>
      </confirmation-modal>
    </template>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from '@/common/AppEvent'
import ConfirmationModal from '@/components/common/modals/ConfirmationModal.vue'
import { MODAL_CLOSE_EVENT, ModalCloseEventData } from '@/components/common/modals/utils';

interface ModalOptions {
  id?: string;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ModalContext extends ModalOptions {
  id: string;
  /**
   * Useful if the modal is made straight from the template and is outside of
   * the pool.
   */
  noDisplay: boolean;
}

const DEFAULT_TITLE = "Are you sure?";
const DEFAULT_MESSAGE = "This action cannot be undone.";
const DEFAULT_YES_LABEL = "Confirm";
const DEFAULT_NO_LABEL = "Cancel";
const MODAL_NAME_PREFIX = "beekeeper-confirmation-modal";

export default Vue.extend({
  components: { ConfirmationModal },
  data() {
    return {
      modals: [],
      idCounter: 0,
    };
  },
  computed: {
    rootBindings() {
      return [
        { event: AppEvent.createConfirmModal, handler: this.createModal },
        { event: AppEvent.showConfirmModal, handler: this.showExistingModal },
        { event: MODAL_CLOSE_EVENT, handler: this.onModalClose },
      ]
    },
  },
  methods: {
    onModalClose(event: ModalCloseEventData) {
      const idx: number = this.modals.findIndex((modal: ModalContext) => modal.id === event.modalId)
      const modal: ModalContext = this.modals[idx];

      if (event.confirmed) modal.onConfirm();
      else modal.onCancel();

      this.modals.splice(idx, 1);
    },
    async showExistingModal(options: ModalOptions) {
      const modal: ModalContext = {
        id: options.id,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        noDisplay: true,
      }
      this.modals.push(modal);
      this.$modal.show(modal.id);
    },
    async createModal(options: ModalOptions) {
      const modal: ModalContext = {
        id: `${MODAL_NAME_PREFIX}-${this.idCounter++}`,
        title: options.title || DEFAULT_TITLE,
        message: options.message || DEFAULT_MESSAGE,
        cancelLabel: options.cancelLabel || DEFAULT_NO_LABEL,
        confirmLabel: options.confirmLabel || DEFAULT_YES_LABEL,
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
        noDisplay: false,
      }
      this.modals.push(modal);
      await this.$nextTick();
      this.$modal.show(modal.id);
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  }
});
</script>
