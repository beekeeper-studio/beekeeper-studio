export interface ModalCloseEventData {
  modalId: string;
  confirmed: boolean;
}

export const MODAL_CLOSE_EVENT = "common-modal-close";

/** One row of the optional list a confirmation modal renders under its message. */
export interface ConfirmationItem {
  label: string;
  /** Short trailing text, eg "Last used 2 days ago". */
  note?: string;
  /** Small uppercase tag after the label, eg "Used". */
  badge?: string;
  /** Draw attention to the row. */
  highlight?: boolean;
}

/** Options accepted by `this.$confirm(title, message, options)`. */
export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "normal" | "danger";
  /**
   * When false the modal has no close button and ignores Escape and overlay
   * clicks: the user has to pick one of the two buttons.
   */
  closable?: boolean;
  /** Checkbox text the user must tick before the confirm button enables. */
  acknowledgement?: string;
  /** Bullet list rendered between the message and the acknowledgement. */
  items?: Array<string | ConfirmationItem>;
}
