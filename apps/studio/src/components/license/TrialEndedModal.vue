<template>
  <base-modal
    ref="modal"
    :name="modalName"
    :closable="false"
    first-focusable=".btn-primary"
    @submit="buyLicense"
  >
    <template #title>
      <i class="material-icons">lock_clock</i>
      Your free trial has ended
    </template>
    <div class="trial-modal trial-ended">
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
            <span class="trial-feature-note">{{ usageNote(feature) }}</span>
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
    </div>
    <template #footer>
      <button
        type="button"
        class="btn btn-flat trial-ended-downgrade"
        @click.prevent="downgrade"
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
        type="submit"
        class="btn btn-primary"
      >
        Buy a license
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
import { ConfirmationItem } from "@/components/common/modals/utils";
import {
  getPaidFeatureUsage,
  rankPaidFeaturesByUsage,
  PaidFeatureUsageMap,
  RankedPaidFeature,
} from "@/lib/paidFeatures";
import {
  formatTrialDate,
  hasDecidedTrialEnd,
  recordTrialEndDecision,
  TrialEndDecision,
} from "@/lib/trial";

const PRICING_URL = "https://www.beekeeperstudio.io/pricing";

/**
 * The decision point at the end of the free trial. There is no way to close
 * it: the user buys a license, enters a license key, or downgrades to the
 * Community Edition (which asks for an explicit acknowledgement first). Until
 * one of those happens it comes back on every launch.
 *
 * Features used during the trial are listed first, so the user sees exactly
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
    confirmItems(): ConfirmationItem[] {
      return this.rankedFeatures.map((feature) => ({
        label: feature.label,
        badge: feature.usage ? "Used" : undefined,
        note: feature.usage ? this.usageNote(feature) : undefined,
        highlight: !!feature.usage,
      }));
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
    usageNote(feature: RankedPaidFeature): string {
      const usage = feature.usage;
      if (!usage) return "";
      const parts: string[] = [];
      if (usage.details?.length) parts.push(usage.details.join(", "));
      parts.push(`Last used ${this.$bks.timeAgo(new Date(usage.lastUsedAt))}`);
      return parts.join(" · ");
    },
    /** Record the answer and release the modal. */
    settle(decision: TrialEndDecision) {
      recordTrialEndDecision(decision);
      this.decided = true;
      this.open = false;
      (this.$refs.modal as any)?.close();
    },
    enterLicense() {
      this.$root.$emit(AppEvent.enterLicense);
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL);
      this.enterLicense();
    },
    async downgrade() {
      const confirmed = await this.$confirm(
        "Downgrade to the Community Edition?",
        "Downgrading locks every paid feature. Saved connections and queries stay put; the features below stop working until a license key is entered.",
        {
          variant: "danger",
          closable: false,
          confirmLabel: "Downgrade to Community Edition",
          cancelLabel: "Go back",
          acknowledgement: "I understand that by downgrading I will lose access to the features below",
          items: this.confirmItems,
        }
      );
      if (!confirmed) return;
      this.settle("downgraded");
      this.$noty.info("Downgraded to the Community Edition. A license key can be entered at any time.");
    },
  },
});
</script>
