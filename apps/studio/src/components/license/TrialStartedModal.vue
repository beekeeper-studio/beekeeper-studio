<template>
  <base-modal
    ref="modal"
    :name="modalName"
    :closable="false"
    first-focusable=".btn-primary"
    @submit="close"
    @closed="dismissed"
  >
    <template #title>
      <i class="material-icons">auto_awesome</i>
      {{ trialDays }} day free trial activated
    </template>
    <div class="trial-modal trial-started">
      <p class="trial-modal-lead">
        All paid app features are unlocked as part of the trial.
        Here are our 6 <em>favorite</em>:
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
        class="btn btn-flat trial-started-learn-more"
        @click.prevent="learnMore"
      >
        Learn more
      </button>
      <span class="expand" />
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
import { TRIAL_HIGHLIGHTS, PaidFeature } from "@/lib/paidFeatures";
import {
  clearTrialWelcomePending,
  formatTrialDate,
  isTrialWelcomePending,
} from "@/lib/trial";

const UPGRADE_URL = "https://www.beekeeperstudio.io/upgrade";

/**
 * Shown once, right after the free trial auto-starts on the first launch.
 * The store sets the pending flag when it creates the trial license; leaving
 * this dialog clears it.
 *
 * There is no close button and Escape does nothing: the user picks one of
 * the buttons. Learn more opens the website and leaves the dialog up.
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
      return TRIAL_HIGHLIGHTS;
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
    learnMore() {
      this.$native.openLink(UPGRADE_URL);
    },
    enterLicense() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
  },
});
</script>
