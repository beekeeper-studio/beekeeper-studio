<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName" @before-close="beforeClose">
      <div class="dialog-content">
        <div class="dialog-c-title">{{ title }}</div>
        <div>{{ body }}</div>
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
import { mapGetters } from "vuex";
import { AppEvent } from "@/common/AppEvent";

const trialTitle = "Your trial has ended";
const trialBody = "Your trial has ended";
const licenseTitle = "Your license has expired";
const licenseBody = "Your license has expired";

export default {
  computed: {
    ...mapGetters({
      status: "licenses/status",
      isTrial: "isTrial",
    }),
    modalName: () => "license-expired-modal",
    title() {
      return this.isTrial ? trialTitle : licenseTitle;
    },
    body() {
      return this.isTrial ? trialBody : licenseBody;
    },
  },
  methods: {
    beforeClose() {
      this.$util.send("appdb/setting/set", {
        key: "openExpiredLicenseModal",
        value: false,
      });
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    purchase() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
    async onLicenseExpired(_license) {
      if (!this.isOpeningModalAllowed()) return;
      this.$modal.show(this.modalName);
    },
    async isOpeningModalAllowed() {
      const openExpiredLicenseModal = await this.$util.send(
        "appdb/setting/get",
        { key: "openExpiredLicenseModal" }
      );
      return openExpiredLicenseModal.value
    },
    rootBindings() {
      return [
        { event: AppEvent.licenseExpired, handler: this.onLicenseExpired },
      ]
    },
  },
  mounted() {
    if (this.status.edition === "community" && this.status.condition === "License expired") {
      this.onLicenseExpired(this.status.license);
    }
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
};
</script>
