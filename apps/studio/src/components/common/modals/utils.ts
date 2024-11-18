export interface ModalCloseEventData {
  modalId: string;
  formData: FormData;
  /**
   * If true, the modal was closed by triggering/clicking a submit button.
   * If false, the modal was closed without submitting. For example, by
   * calling `this.$hideModal(id)` or `this.$modal.hide(id)`.
   *
   **/
  closedWithoutSubmitter: boolean;
}

export const MODAL_CLOSE_EVENT = "common-modal-close";
