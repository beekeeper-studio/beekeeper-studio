<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal license-lapsed-modal"
      :name="modalName"
      height="auto"
    >
      <license-lapsed-dialog
        title="Your license has ended"
        :used-features="usedFeatures"
        features-heading="Paid features used under this license, now locked:"
        buy-label="Renew license"
        @dismiss="close"
        @request="requestLicense"
        @buy="purchase"
        @enter-license="enterLicense"
      >
        <template #intro>
          The license expired {{ endedOn }}. Beekeeper Studio is now running the free version.
          Connections, saved queries, and settings are unchanged. Renewing restores the paid features.
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
import { mapGetters, mapState } from "vuex";

export default {
  components: { LicenseLapsedDialog },
  computed: {
    ...mapGetters("paidFeatureUsage", ["usedFeatures"]),
    ...mapState("licenses", { licenseStatus: "status" }),
    modalName: () => "license-expired-modal",
    endedOn() {
      const validUntil = this.licenseStatus?.license?.validUntil;
      return validUntil ? `on ${new Date(validUntil).toLocaleDateString()}` : "recently";
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
      if (!status.isTrial && status.isCommunity) {
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
