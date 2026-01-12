<template>
  <portal to="modals">
    <modal class="vue-dialog beekeeper-modal" :name="modalName">
      <div class="dialog-content">
        <div class="dialog-c-title">
          {{ $t('Your license has ended') }}
        </div>
        <div>{{ $t('Your license has ended') }}</div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-flat" type="button" @click.prevent="close">
          {{ $t('Downgrade to limited free edition') }}
        </button>
        <a
          ref="learnMore"
          href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
          class="btn btn-flat"
        >
          {{ $t('Learn more') }}
        </a>
        <button class="btn btn-flat" type="button" @click.prevent="purchase">
          {{ $t('Purchase a license') }}
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
