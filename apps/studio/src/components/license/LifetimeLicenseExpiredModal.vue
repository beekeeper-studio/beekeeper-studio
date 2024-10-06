<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">Your license has ended</div>
        <div>
          Your license has ended. But you can continue using all features using
          Beekeeper Studio version {{ maxAllowedVersion }} or later.
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Close
        </button>
        <a
          ref="learnMore"
          href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
          class="btn btn-flat"
        >
          Learn more
        </a>
        <button class="btn btn-flat" type="button" @click.prevent="purchase">
          Purchase a license
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from "@/common/AppEvent";
import type { LicenseStatus } from "@/lib/license";

export default {
  computed: {
    modalName: () => "license-expired-modal",
    maxAllowedVersion() {
      const version = this.$store.state.licenses.status.maxAllowedVersion;
      return `${version.major}.${version.minor}.${version.patch}`;
    },
    rootBindings() {
      return [
        { event: AppEvent.licenseSupportDateExpired, handler: this.onLicenseExpired },
      ];
    },
  },
  methods: {
    close() {
      this.$modal.hide(this.modalName);
    },
    purchase() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
    async onLicenseExpired(status: LicenseStatus) {
      if (!status.isTrial && status.isUltimate) {
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
