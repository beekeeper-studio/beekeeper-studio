<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal license-lapsed-modal"
      :name="modalName"
      height="auto"
    >
      <license-lapsed-dialog
        title="Your free trial has ended"
        :used-features="usedFeatures"
        @dismiss="close"
        @request="requestLicense"
        @buy="purchase"
        @enter-license="enterLicense"
      >
        <template #intro>
          The 14-day trial ended {{ endedOn }}. Beekeeper Studio is now running the free version.
          Connections, saved queries, and settings are unchanged.
        </template>
      </license-lapsed-dialog>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from "@/common/AppEvent";
import type { LicenseStatus } from "@/lib/license";
import { PRICING_URL } from "@/lib/purchaseRequest";
import LicenseLapsedDialog from "./LicenseLapsedDialog.vue";
import { mapGetters } from "vuex";

export default {
  components: { LicenseLapsedDialog },
  computed: {
    ...mapGetters("paidFeatureUsage", ["usedFeatures"]),
    ...mapGetters("licenses", ["trialLicense"]),
    modalName: () => "trial-expired-modal",
    endedOn() {
      const validUntil = this.trialLicense?.validUntil;
      return validUntil ? `on ${validUntil.toLocaleDateString()}` : "recently";
    },
    rootBindings() {
      return [
        { event: AppEvent.licenseValidDateExpired, handler: this.onLicenseExpired },
      ]
    },
  },
  methods: {
    close() {
      this.$modal.hide(this.modalName);
    },
    purchase() {
      this.close();
      this.$native.openLink(PRICING_URL);
    },
    requestLicense() {
      this.close();
      this.$root.$emit(AppEvent.purchaseRequest);
    },
    enterLicense() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
    onLicenseExpired(status: LicenseStatus) {
      if (status.isTrial) {
        this.$modal.show(this.modalName);
      }
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
};
</script>
