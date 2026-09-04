<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal purchase-request-modal"
      :name="modalName"
      height="auto"
      :scrollable="true"
      @before-open="beforeOpen"
      @opened="focusDialog"
    >
      <div
        v-kbd-trap="true"
        class="purchase-request"
      >
        <div class="dialog-content">
          <button
            class="close-btn btn btn-fab"
            @click.prevent="close"
            aria-label="Close"
            ref="closeButton"
          >
            <i class="material-icons">clear</i>
          </button>
          <h3 class="dialog-c-title">
            Request a license from your team
          </h3>
          <p class="dialog-c-subtitle">
            A plain-text request for whoever approves software purchases.
            Copy it into email or chat and edit as needed.
          </p>

          <div class="purchase-request-options">
            <div class="form-group">
              <label for="purchase-request-plan">Plan</label>
              <select
                id="purchase-request-plan"
                class="form-control custom-select"
                v-model="planId"
              >
                <option
                  v-for="option in plans"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.name }} · ${{ option.yearlyPerMonth }}/user/month billed yearly · {{ option.summary }}
                </option>
              </select>
            </div>
            <div class="form-group purchase-request-seats">
              <label for="purchase-request-seats">Seats</label>
              <input
                id="purchase-request-seats"
                type="number"
                min="1"
                max="1000"
                step="1"
                class="form-control"
                v-model.number="seats"
              >
            </div>
          </div>
          <p
            v-if="seatNote"
            class="purchase-request-note"
          >
            <i class="material-icons">info_outline</i>
            <span>{{ seatNote }}</span>
          </p>

          <textarea
            ref="textarea"
            class="form-control purchase-request-text"
            readonly
            rows="12"
            spellcheck="false"
            :value="text"
            @focus="selectAll"
          />

          <p class="purchase-request-footnote">
            Prices are the list prices this version shipped with.
            <a
              href="#"
              @click.prevent="openPricing"
            >Current pricing</a>
            · Larger teams and invoicing: {{ salesEmail }}
          </p>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="openQuote"
          >
            Get a formal quote (PDF)
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click.prevent="copy"
          >
            Copy request
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
import {
  DEFAULT_PLAN_ID,
  PLANS,
  PRICING_URL,
  QUOTE_URL,
  SALES_EMAIL,
  Plan,
  PlanId,
  buildPurchaseRequest,
  planById,
  recommendedPlan,
} from '@/lib/purchaseRequest'
import { UsedPaidFeature } from '@/lib/paidFeatures'

export interface PurchaseRequestModalOptions {
  planId?: PlanId
  seats?: number
}

export default Vue.extend({
  data() {
    return {
      modalName: 'purchase-request-modal',
      planId: DEFAULT_PLAN_ID as PlanId,
      seats: 1,
      plans: PLANS,
      salesEmail: SALES_EMAIL,
    }
  },
  computed: {
    ...mapGetters('paidFeatureUsage', ['usedFeatures']),
    ...mapGetters('licenses', ['trialLicense']),
    plan(): Plan {
      return planById(this.planId)
    },
    seatCount(): number {
      const n = Math.floor(Number(this.seats))
      return Number.isFinite(n) && n > 0 ? n : 1
    },
    seatNote(): string | null {
      const { plan, seatCount } = this
      if (!plan.maxSeats || seatCount <= plan.maxSeats) return null
      const fits = recommendedPlan(seatCount)
      return `The ${plan.name} plan is limited to ${plan.maxSeats} seats. ${fits.name} covers ${seatCount}.`
    },
    text(): string {
      return buildPurchaseRequest({
        plan: this.plan,
        seats: this.seatCount,
        usedFeatures: (this.usedFeatures as UsedPaidFeature[]).map((f) => f.displayLabel),
        trialed: !!this.trialLicense,
      })
    },
    rootBindings() {
      return [
        { event: AppEvent.purchaseRequest, handler: this.show },
      ]
    },
  },
  methods: {
    show(options: PurchaseRequestModalOptions = {}) {
      this.planId = options.planId ?? DEFAULT_PLAN_ID
      this.seats = options.seats ?? 1
      this.$modal.show(this.modalName)
    },
    beforeOpen() {
      // nothing to reset beyond what show() sets; kept for symmetry with other modals
    },
    focusDialog() {
      this.$nextTick(() => {
        const el = this.$refs.closeButton as HTMLElement | undefined
        el?.focus()
      })
    },
    close() {
      this.$modal.hide(this.modalName)
    },
    selectAll(event: FocusEvent) {
      (event.target as HTMLTextAreaElement).select()
    },
    copy() {
      this.$native.clipboard.writeText(this.text)
    },
    openQuote() {
      this.$native.openLink(QUOTE_URL)
    },
    openPricing() {
      this.$native.openLink(PRICING_URL)
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
})
</script>
