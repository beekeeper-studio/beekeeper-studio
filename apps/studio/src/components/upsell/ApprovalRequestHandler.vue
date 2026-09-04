<template>
  <div v-if="false" />
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
import { approvalRequestUrl } from '@/lib/approvalRequest'
import { UsedPaidFeature } from '@/lib/paidFeatures'

/**
 * Renderless. Every "Draft manager approval request" action emits
 * AppEvent.purchaseRequest; this opens the website page that writes the
 * request, pre-filled with the paid features this install used and when the
 * trial ended. Prices live on the website, not in the app.
 */
export default Vue.extend({
  computed: {
    ...mapGetters('paidFeatureUsage', ['usedFeatures']),
    ...mapGetters('licenses', ['trialLicense']),
    url(): string {
      return approvalRequestUrl({
        usedFeatures: (this.usedFeatures as UsedPaidFeature[]).map((f) => f.displayLabel),
        trialEndsAt: this.trialLicense?.validUntil ? new Date(this.trialLicense.validUntil) : null,
      })
    },
    rootBindings() {
      return [
        { event: AppEvent.purchaseRequest, handler: this.open },
      ]
    },
  },
  methods: {
    open() {
      this.$native.openLink(this.url)
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
