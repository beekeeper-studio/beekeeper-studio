<template>
  <base-modal
    ref="modal"
    :name="modalName"
    first-focusable=".btn-primary"
    @submit="close"
    @closed="dismissed"
  >
    <template #title>
      <i class="material-icons">auto_awesome</i>
      Every paid feature is unlocked
    </template>
    <div class="trial-modal trial-started">
      <p class="trial-modal-lead">
        This install includes a {{ trialDays }}-day free trial of the full edition.
        No account, no card, nothing to cancel.
      </p>
      <ul class="trial-feature-list">
        <li
          v-for="feature in features"
          :key="feature.id"
          v-tooltip="feature.description"
        >
          <i class="material-icons">check_circle</i>
          <span class="trial-feature-label">{{ feature.label }}</span>
        </li>
      </ul>
      <p class="trial-modal-hint">
        The trial ends {{ endsOn }}. After that the app drops back to the
        Community Edition unless a license key is entered.
      </p>
    </div>
    <template #footer>
      <button
        type="button"
        class="btn btn-flat"
        @click.prevent="enterLicense"
      >
        Enter a license key
      </button>
      <button
        type="submit"
        class="btn btn-primary"
      >
        Start exploring
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import globals from "@/common/globals";
import { PAID_FEATURES, PaidFeature } from "@/lib/paidFeatures";
import {
  clearTrialWelcomePending,
  formatTrialDate,
  isTrialWelcomePending,
} from "@/lib/trial";

/**
 * Shown once, right after the free trial auto-starts on the first launch.
 * The store sets the pending flag when it creates the trial license; closing
 * this dialog clears it.
 */
export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "trial-started-modal",
      pending: isTrialWelcomePending(),
    };
  },
  computed: {
    ...mapState("licenses", {
      licensesInitialized: (state: any) => state.initialized,
    }),
    ...mapGetters("licenses", ["isTrialActive", "trialLicense"]),
    shouldShow(): boolean {
      return this.licensesInitialized && this.isTrialActive && this.pending;
    },
    features(): PaidFeature[] {
      return PAID_FEATURES;
    },
    trialDays(): number {
      return globals.freeTrialDays;
    },
    endsOn(): string {
      const validUntil = this.trialLicense?.validUntil;
      return validUntil ? `on ${formatTrialDate(validUntil)}` : `in ${this.trialDays} days`;
    },
  },
  watch: {
    shouldShow: {
      immediate: true,
      async handler(show: boolean) {
        if (!show) return;
        await this.$nextTick();
        this.$modal.show(this.modalName);
      },
    },
  },
  methods: {
    close() {
      this.dismissed();
      (this.$refs.modal as any)?.close();
    },
    dismissed() {
      clearTrialWelcomePending();
      this.pending = false;
    },
    enterLicense() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
  },
});
</script>
