<template>
  <base-modal
    ref="modal"
    :name="id"
    :closable="closable"
    @before-open="acknowledged = false"
    @submit="confirm"
    @closed="reportClose(false)"
  >
    <template #title>
      <slot name="title">Are you sure?</slot>
    </template>
    <slot name="message">This action cannot be undone.</slot>
    <label
      v-if="acknowledgement"
      class="confirmation-acknowledgement"
    >
      <input
        v-model="acknowledged"
        type="checkbox"
        class="confirmation-acknowledgement-input"
      >
      <span>{{ acknowledgement }}</span>
    </label>
    <ul
      v-if="normalizedItems.length"
      class="confirmation-items"
    >
      <li
        v-for="(item, index) in normalizedItems"
        :key="index"
        class="confirmation-item"
        :class="{ 'confirmation-item--highlight': item.highlight }"
      >
        <span class="confirmation-item-label">{{ item.label }}</span>
        <span
          v-if="item.badge"
          class="confirmation-item-badge"
        >{{ item.badge }}</span>
        <span
          v-if="item.note"
          class="confirmation-item-note"
        >{{ item.note }}</span>
      </li>
    </ul>
    <template #footer>
      <button class="btn btn-flat" type="button" @click.prevent="cancel">
        <slot name="cancel-label">Cancel</slot>
      </button>
      <button
        class="btn btn-primary"
        type="submit"
        :data-variant="variant"
        :disabled="!canConfirm"
      >
        <slot name="confirm-label">Confirm</slot>
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import {
  ConfirmationItem,
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
    /**
     * When false the user has to pick one of the two buttons: no close
     * button, and Escape / overlay clicks are ignored.
     */
    closable: {
      type: Boolean,
      default: true,
    },
    /** Checkbox text the user must tick before the confirm button enables. */
    acknowledgement: {
      type: String,
      default: null,
    },
    /** Bullet list rendered between the message and the acknowledgement. */
    items: {
      type: Array as PropType<Array<string | ConfirmationItem>>,
      default: () => [],
    },
  },
  data() {
    return {
      acknowledged: false,
    };
  },
  computed: {
    normalizedItems(): ConfirmationItem[] {
      return this.items.map((item) =>
        typeof item === "string" ? { label: item } : item
      );
    },
    canConfirm(): boolean {
      return !this.acknowledgement || this.acknowledged;
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
      if (!this.canConfirm) return;
      this.reportClose(true);
      this.close();
    },
    cancel() {
      this.reportClose(false);
      this.close();
    },
    // Goes through BaseModal so a non-closable modal still closes on an
    // explicit button press.
    close() {
      (this.$refs.modal as any).close();
    },
  },
  mounted() {
    if (!this.id) {
      throw new Error("No id provided for ConfirmationModal.");
    }
  },
});
</script>

<style lang="scss" scoped>
.btn[data-variant=danger] {
  background-color: var(--brand-danger);
  color: white;
}

.confirmation-acknowledgement {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin: 1rem 0 0.25rem;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;

  .confirmation-acknowledgement-input {
    flex-shrink: 0;
    margin-top: 0.15rem;
  }
}

.confirmation-items {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 16rem;
  overflow-y: auto;
}

.confirmation-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.confirmation-item--highlight {
  background: rgb(from var(--brand-danger) r g b / 12%);

  .confirmation-item-label {
    color: var(--text-dark);
    font-weight: 500;
  }
}

.confirmation-item-badge {
  flex-shrink: 0;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-danger);
}

.confirmation-item-note {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--text-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
