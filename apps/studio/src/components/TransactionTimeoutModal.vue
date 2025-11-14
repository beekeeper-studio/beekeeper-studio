<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      :name="name"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Transaction Timed Out
        </div>
        <div>
          The active transaction for this tab has timed out. Would you like to rollback the changes or keep the transaction active?
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          style="margin-right: 0.5rem;"
          type="button"
          @click.prevent="continueTransaction"
        >
          Continue
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="rollback"
          autofocus
        >
          Rollback
        </button>
      </div>
    </modal>
  </portal>

</template>

<script lang="ts">

export default {
  props: ["tabId", "show"],
  computed: {
    name() {
      return `transaction-timeout-modal-${this.tabId}`
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.$modal.show(this.name);
      }
    }
  },
  methods: {
    rollback() {
      this.$emit('rollback')
      this.$modal.hide(this.name);
    },
    continueTransaction() {
      this.$emit('continueTransaction')
      this.$modal.hide(this.name);
    }
  }
}
</script>
