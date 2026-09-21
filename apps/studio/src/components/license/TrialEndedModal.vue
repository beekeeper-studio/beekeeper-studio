<template>
  <base-modal
    ref="modal"
    :name="modalName"
    :closable="false"
    first-focusable=".btn-primary"
    @before-open="reset"
    @submit="submit"
  >
    <template #title>
      <template v-if="step === 'offer'">
        <i class="material-icons">lock_clock</i>
        Your free trial has ended
      </template>
      <template v-else>
        <i class="material-icons text-danger">warning</i>
        Downgrade to the Community Edition?
      </template>
    </template>

    <div class="trial-modal trial-ended">
      <!-- Step 1: the offer -->
      <template v-if="step === 'offer'">
        <p class="trial-modal-lead">
          The {{ trialDays }}-day trial ended {{ endedWhen }}. Every paid feature
          is locked until a license key is entered.
        </p>

        <section
          v-if="usedFeatures.length"
          class="trial-feature-group trial-feature-group--used"
        >
          <h4 class="trial-feature-heading">
            Used during the trial
          </h4>
          <ul class="trial-feature-list trial-feature-list--stacked">
            <li
              v-for="feature in usedFeatures"
              :key="feature.id"
              class="trial-feature--used"
            >
              <i class="material-icons">lock</i>
              <span class="trial-feature-label">{{ feature.label }}</span>
              <span class="trial-feature-badge">Used</span>
            </li>
          </ul>
        </section>

        <section class="trial-feature-group">
          <h4 class="trial-feature-heading">
            {{ usedFeatures.length ? 'Also locked' : 'Now locked' }}
          </h4>
          <ul class="trial-feature-list">
            <li
              v-for="feature in unusedFeatures"
              :key="feature.id"
              v-tooltip="feature.description"
            >
              <i class="material-icons">lock_outline</i>
              <span class="trial-feature-label">{{ feature.label }}</span>
            </li>
          </ul>
        </section>

        <p class="trial-modal-hint">
          Subscriptions of 12+ months include lifetime access to every version
          released while subscribed. 30-day money-back guarantee.
        </p>
      </template>

      <!-- Step 2: acknowledge what a downgrade loses -->
      <template v-else>
        <p class="trial-modal-lead">
          Downgrading locks every paid feature. Saved connections and queries
          stay put; the features below stop working until a license key is
          entered.
        </p>
        <label class="trial-downgrade-acknowledgement">
          <input
            ref="acknowledge"
            v-model="acknowledged"
            type="checkbox"
            class="trial-downgrade-acknowledge"
          >
          <span>I understand that by downgrading I will lose access to the features below</span>
        </label>
        <ul class="trial-feature-list trial-feature-list--stacked trial-feature-list--confirm">
          <li
            v-for="feature in confirmFeatures"
            :key="feature.id"
            :class="{ 'trial-feature--used': !!feature.usage }"
          >
            <i class="material-icons">{{ feature.usage ? 'lock' : 'lock_outline' }}</i>
            <span class="trial-feature-label">{{ feature.label }}</span>
            <span
              v-if="feature.usage"
              class="trial-feature-badge"
            >Used</span>
          </li>
        </ul>
        <p class="trial-feature-more">
          and all
          <a
            href="#"
            class="trial-feature-more-link"
            @click.prevent="openPricing"
          >other paid features</a>
        </p>
      </template>
    </div>

    <template #footer>
      <template v-if="step === 'offer'">
        <button
          type="button"
          class="btn btn-flat trial-ended-downgrade"
          @click.prevent="goToDowngrade"
        >
          Downgrade to Community Edition
        </button>
        <span class="expand" />
        <button
          type="button"
          class="btn btn-flat"
          @click.prevent="enterLicense"
        >
          Enter license key
        </button>
        <button
          ref="buyButton"
          type="submit"
          class="btn btn-primary"
        >
          Buy a license
        </button>
      </template>
      <template v-else>
        <button
          type="button"
          class="btn btn-flat trial-ended-back"
          @click.prevent="goToOffer"
        >
          Go back
        </button>
        <span class="expand" />
        <button
          type="submit"
          class="btn btn-danger"
          :disabled="!acknowledged"
        >
          Downgrade to Community Edition
        </button>
      </template>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import globals from "@/common/globals";
import {
  getPaidFeatureUsage,
  rankPaidFeaturesByUsage,
  PaidFeatureUsageMap,
  RankedPaidFeature,
  TRIAL_HIGHLIGHTS,
} from "@/lib/paidFeatures";
import {
  formatTrialDate,
  hasDecidedTrialEnd,
  recordTrialEndDecision,
  TrialEndDecision,
} from "@/lib/trial";

const PRICING_URL = "https://www.beekeeperstudio.io/pricing";

type Step = "offer" | "downgrade";

/**
 * The decision point at the end of the free trial, as a two-step modal in the
 * style of SqlFilesImportModal: the same dialog swaps its body and footer
 * between the offer and the downgrade acknowledgement.
 *
 * There is no way to close it. The user buys a license, enters a license key,
 * or downgrades to the Community Edition after ticking "I understand" on step
 * two. Until one of those happens it comes back on every launch.
 *
 * Features used during the trial lead both lists, so the user sees exactly
 * what stops working.
 */
export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "trial-ended-modal",
      decided: hasDecidedTrialEnd(),
      usage: getPaidFeatureUsage() as PaidFeatureUsageMap,
      open: false,
      step: "offer" as Step,
      acknowledged: false,
    };
  },
  computed: {
    ...mapState("licenses", {
      licensesInitialized: (state: any) => state.initialized,
    }),
    ...mapGetters("licenses", ["isTrialExpired", "isUltimate", "isTrial", "trialLicense"]),
    shouldShow(): boolean {
      return this.licensesInitialized && this.isTrialExpired && !this.decided;
    },
    /** A paid, non-trial license is active: the user bought or entered a key. */
    licensed(): boolean {
      return this.isUltimate && !this.isTrial;
    },
    rankedFeatures(): RankedPaidFeature[] {
      return rankPaidFeaturesByUsage(this.usage);
    },
    usedFeatures(): RankedPaidFeature[] {
      return this.rankedFeatures.filter((feature) => feature.usage);
    },
    unusedFeatures(): RankedPaidFeature[] {
      return this.rankedFeatures.filter((feature) => !feature.usage);
    },
    /**
     * What step two names. Whatever the trial actually used, or the three we
     * lead with when it used nothing. Either way the "and all other paid
     * features" line covers the rest, which keeps this step no taller than
     * the offer it follows.
     */
    confirmFeatures(): RankedPaidFeature[] {
      if (this.usedFeatures.length) return this.usedFeatures;
      return TRIAL_HIGHLIGHTS.slice(0, 3).map((feature) => ({ ...feature, usage: null }));
    },
    trialDays(): number {
      return globals.freeTrialDays;
    },
    endedWhen(): string {
      const validUntil = this.trialLicense?.validUntil;
      return validUntil ? `on ${formatTrialDate(validUntil)}` : "recently";
    },
  },
  watch: {
    shouldShow: {
      immediate: true,
      handler(show: boolean) {
        if (show) this.show();
      },
    },
    licensed(value: boolean) {
      if (value && this.open) this.settle("licensed");
    },
  },
  methods: {
    async show() {
      this.usage = getPaidFeatureUsage();
      await this.$nextTick();
      this.open = true;
      this.$modal.show(this.modalName);
    },
    reset() {
      this.step = "offer";
      this.acknowledged = false;
    },
    /** Record the answer and release the modal. */
    settle(decision: TrialEndDecision) {
      recordTrialEndDecision(decision);
      this.decided = true;
      this.open = false;
      (this.$refs.modal as any)?.close();
    },
    submit() {
      if (this.step === "offer") {
        this.buyLicense();
      } else {
        this.confirmDowngrade();
      }
    },
    enterLicense() {
      this.$root.$emit(AppEvent.enterLicense);
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL);
      this.enterLicense();
    },
    /** The step two link: the pricing page on its own, no license dialog. */
    openPricing() {
      this.$native.openLink(PRICING_URL);
    },
    async goToDowngrade() {
      this.acknowledged = false;
      this.step = "downgrade";
      await this.$nextTick();
      (this.$refs.acknowledge as HTMLInputElement | undefined)?.focus();
    },
    async goToOffer() {
      this.step = "offer";
      await this.$nextTick();
      (this.$refs.buyButton as HTMLButtonElement | undefined)?.focus();
    },
    confirmDowngrade() {
      if (!this.acknowledged) return;
      this.settle("downgraded");
      this.$noty.info("Downgraded to the Community Edition. A license key can be entered at any time.");
    },
  },
});
</script>
