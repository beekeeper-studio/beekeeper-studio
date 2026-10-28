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
          Your trial ended {{ endedWhen }}. You need to buy a license to keep access to the following features:
        </p>

        <ul class="trial-feature-list trial-feature-list--offer">
          <!-- The description sits on the icon and label rather than the row:
               the badge carries its own tooltip, and nesting one inside the
               other pops both open when the pointer lands on the badge. -->
          <li
            v-for="feature in offerFeatures"
            :key="feature.id"
            :class="{ 'trial-feature--used': !!feature.usage }"
          >
            <i
              v-tooltip="feature.description"
              class="material-icons"
            >{{ feature.usage ? 'lock' : 'lock_outline' }}</i>
            <span
              v-tooltip="feature.description"
              class="trial-feature-label"
            >{{ feature.label }}</span>
            <span
              v-if="feature.usage"
              v-tooltip="usedTooltip"
              class="trial-feature-badge"
            >Used</span>
          </li>
          <li class="trial-feature-more">
            <i class="material-icons">more_horiz</i>
            <span class="trial-feature-label">
              and all
              <a
                href="#"
                class="trial-feature-more-link"
                @click.prevent="openPricing"
              >other paid features</a>
            </span>
          </li>
        </ul>

        <p class="trial-modal-hint">
          Every purchase includes lifetime access and a 30-day money-back guarantee.
        </p>
      </template>

      <!-- Step 2: acknowledge what a downgrade loses -->
      <template v-else>
        <p class="trial-modal-lead">
          Please confirm that you understand the consequences of downgrading to the community edition.
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
        <ul class="trial-feature-list trial-feature-list--confirm">
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
          <li class="trial-feature-more">
            <i class="material-icons">more_horiz</i>
            <span class="trial-feature-label">
              and all
              <a
                href="#"
                class="trial-feature-more-link"
                @click.prevent="openPricing"
              >other paid features</a>
            </span>
          </li>
        </ul>
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
          class="btn btn-danger trial-ended-confirm"
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
import { SmartLocalStorage } from "@/common/LocalStorage";
import globals from "@/common/globals";
import {
  getPaidFeatureUsage,
  rankPaidFeaturesByUsage,
  PaidFeatureUsageMap,
  RankedPaidFeature,
} from "@/lib/paidFeatures";
import {
  formatTrialDate,
  hasDowngradedAfterTrial,
  recordTrialDowngrade,
  TRIAL_END_DECISION_KEY,
} from "@/lib/trial";

const PRICING_URL = "https://www.beekeeperstudio.io/pricing";
/** How many features either list names before deferring to the pricing page. */
const FEATURE_LIMIT = 6;
/** Step two always names at least this many, so one used feature is not a list of one. */
const MIN_CONFIRM_FEATURES = 4;
const USED_TOOLTIP = "You used this feature recently";

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
 * Only the downgrade is written down (lib/trial.ts). A license needs no
 * record: while one is registered the status is no longer an expired trial,
 * and removing it brings the dialog back. The record is shared between the
 * app's windows through localStorage, so answering in one closes the rest.
 *
 * Features used during the trial lead both lists, so the user sees exactly
 * what stops working.
 */
export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "trial-ended-modal",
      // Mirrors the stored answer; refreshed when another window writes it.
      downgraded: hasDowngradedAfterTrial(),
      usage: getPaidFeatureUsage() as PaidFeatureUsageMap,
      open: false,
      step: "offer" as Step,
      acknowledged: false,
      stopWatchingStorage: null as (() => void) | null,
    };
  },
  computed: {
    ...mapState("licenses", {
      licensesInitialized: (state: any) => state.initialized,
    }),
    ...mapGetters("licenses", ["isTrialExpired", "realLicenses", "trialLicense"]),
    /**
     * The expired trial has to be the only license there is. Someone holding
     * a paid key, whatever its state, is the license dialogs' concern: a
     * lifetime key that stops short of this version, say, must never be met
     * with an offer to downgrade.
     */
    shouldShow(): boolean {
      return (
        this.licensesInitialized &&
        this.isTrialExpired &&
        this.realLicenses.length === 0 &&
        !this.downgraded
      );
    },
    rankedFeatures(): RankedPaidFeature[] {
      return rankPaidFeaturesByUsage(this.usage);
    },
    usedFeatures(): RankedPaidFeature[] {
      return this.rankedFeatures.filter((feature) => feature.usage);
    },
    /** The offer's single list: whatever was used first, then the catalogue. */
    offerFeatures(): RankedPaidFeature[] {
      return this.rankedFeatures.slice(0, FEATURE_LIMIT);
    },
    usedTooltip(): string {
      return USED_TOOLTIP;
    },
    /**
     * What step two names: everything the trial used, padded out of the
     * catalogue to a sensible minimum. rankedFeatures is already used-first,
     * so slicing it keeps the used ones at the top. The "and all other paid
     * features" line covers the rest, which keeps this step no taller than
     * the offer it follows.
     */
    confirmFeatures(): RankedPaidFeature[] {
      const count = Math.min(
        Math.max(this.usedFeatures.length, MIN_CONFIRM_FEATURES),
        FEATURE_LIMIT
      );
      return this.rankedFeatures.slice(0, count);
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
        if (show) {
          this.show();
        } else if (this.open) {
          // A license was registered, here or in another window, or the
          // downgrade was recorded in another window.
          this.release();
        }
      },
    },
  },
  created() {
    this.stopWatchingStorage = SmartLocalStorage.onChange(TRIAL_END_DECISION_KEY, () => {
      this.downgraded = hasDowngradedAfterTrial();
    });
  },
  beforeDestroy() {
    this.stopWatchingStorage?.();
    if (this.open) this.$store.commit("licenses/setBlockingDialog", null);
  },
  methods: {
    async show() {
      this.usage = getPaidFeatureUsage();
      this.open = true;
      this.$store.commit("licenses/setBlockingDialog", this.modalName);
      // The immediate watcher runs before the <modal> inside the portal is
      // mounted, and vue-js-modal drops a show() nobody is listening for.
      await this.$nextTick();
      if (!this.open) return;
      this.$modal.show(this.modalName);
    },
    reset() {
      this.step = "offer";
      this.acknowledged = false;
    },
    /** Close without recording anything: the license status, or another window, has answered. */
    release() {
      this.open = false;
      this.$store.commit("licenses/setBlockingDialog", null);
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
      recordTrialDowngrade();
      this.downgraded = true;
      this.release();
      this.$noty.info("Downgraded to the Community Edition. A license key can be entered at any time.");
    },
  },
});
</script>
