<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName" @before-close="beforeClose">
      <div class="dialog-content">
        <div class="dialog-c-title">Your trial has ended</div>
        <div>Your trial has ended</div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          Downgrade to limited free edition
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

export default {
  computed: {
    modalName: () => "trial-expired-modal",
    rootBindings() {
      return [
        { event: AppEvent.licenseExpired, handler: this.onLicenseExpired },
      ]
    },
  },
  methods: {
    beforeClose() {
      this.$store.dispatch("toggleShowExpiredLicenseModal", false);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    purchase() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
    async onLicenseExpired(_license) {
      if (!this.$store.getters.showExpiredLicenseModal) return;
      this.$modal.show(this.modalName);
    },
  },
  mounted() {
    const status = this.$store.state.licenses.status;
    if (status.isCommunity && status.condition === "License expired") {
      this.onLicenseExpired(status.license);
    }
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
};
</script>
