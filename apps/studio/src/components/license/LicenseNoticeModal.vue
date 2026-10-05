<template>
  <base-modal
    ref="modal"
    :name="modalName"
    first-focusable=".btn-primary"
    @closed="handleClosed"
  >
    <template #title>
      <i class="material-icons">info_outline</i>
      {{ title }}
    </template>

    <div class="trial-modal license-notice">
      <div
        v-if="justRegistered"
        class="alert alert-success license-notice-registered"
      >
        <i class="material-icons">check_circle</i>
        <div class="alert-body">
          Key registered for <strong>{{ email }}</strong>.
        </div>
      </div>

      <p class="trial-modal-lead">
        <template v-if="variant === 'version'">
          This license includes lifetime use of Beekeeper Studio up to <strong>{{ coveredVersion }}</strong>.
          This is <strong>{{ appVersion }}</strong>, so paid features are off in this version.
        </template>
        <template v-else>
          The subscription on this key ended on <strong>{{ endedOn }}</strong> and has no lifetime terms,
          so it does not unlock Beekeeper Studio.
        </template>
      </p>

      <ul class="license-notice-options">
        <li>
          <i class="material-icons">shopping_cart</i>
          <div class="license-notice-option-text">
            <strong>Buy a new license</strong>
            <span v-if="variant === 'version'">Unlocks {{ appVersion }} and every update for a year, with lifetime use of those versions. Existing keys cannot be extended.</span>
            <span v-else>Expired keys cannot be reactivated. A new key unlocks every version released during its term, with lifetime use of those versions.</span>
          </div>
          <button
            type="button"
            class="btn btn-primary license-notice-buy"
            @click.prevent="buyLicense"
          >
            Buy license
          </button>
        </li>
        <li v-if="variant === 'version'">
          <i class="material-icons">file_download</i>
          <div class="license-notice-option-text">
            <strong>Install {{ coveredVersion }}</strong>
            <span>Every paid feature keeps working in the version this license covers.</span>
          </div>
          <button
            type="button"
            class="btn btn-flat license-notice-download"
            @click.prevent="downloadCovered"
          >
            Download
          </button>
        </li>
        <li>
          <i class="material-icons">lock_open</i>
          <div class="license-notice-option-text">
            <strong v-if="variant === 'version'">Stay on {{ appVersion }} with the Community Edition</strong>
            <strong v-else>Continue with the Community Edition</strong>
            <span>The key stays registered; this notice is not shown again for this key on {{ appVersion }}.</span>
          </div>
          <button
            type="button"
            class="btn btn-flat license-notice-continue"
            @click.prevent="close"
          >
            Continue
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <a
        href="#"
        class="license-notice-manage"
        @click.prevent="manageLicense"
      >Manage license key</a>
      <span class="expand" />
      <span class="trial-modal-hint">Shown once per key and app version</span>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import { SmartLocalStorage } from "@/common/LocalStorage";
import { formatTrialDate } from "@/lib/trial";

const PRICING_URL = "https://www.beekeeperstudio.io/pricing";
const RELEASES_URL = "https://github.com/beekeeper-studio/beekeeper-studio/releases/tag/";
/** `${key}:${appVersion}` of the last notice the user dismissed. */
export const LICENSE_NOTICE_SEEN_KEY = "licenseNoticeSeen";

type Variant = "version" | "expired";

/**
 * A paid key is registered but does not unlock this app: either its valid
 * date has passed, or it is a lifetime key sold for an earlier version.
 *
 * Opens on launch (once per key and app version) and right after such a key
 * is registered, so a trial user who enters it is told what it covers rather
 * than left in front of a trial dialog that has nothing to do with it.
 */
export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "license-notice-modal",
      open: false,
      justRegistered: false,
    };
  },
  computed: {
    ...mapState("licenses", {
      status: (state: any) => state.status,
      licensesInitialized: (state: any) => state.initialized,
    }),
    ...mapGetters("licenses", ["paidButCommunity"]),
    license(): any {
      return this.status?.license;
    },
    variant(): Variant {
      return this.status?.isValidDateExpired ? "expired" : "version";
    },
    title(): string {
      return this.variant === "version"
        ? "Your license covers an earlier version"
        : "Your license has expired";
    },
    email(): string {
      return this.license?.email ?? "";
    },
    coveredVersion(): string {
      return this.license?.maxAllowedAppRelease?.tagName ?? "";
    },
    appVersion(): string {
      return this.$config?.appVersion ?? "";
    },
    endedOn(): string {
      return this.license?.validUntil ? formatTrialDate(this.license.validUntil) : "";
    },
    seenKey(): string {
      return `${this.license?.key ?? ""}:${this.appVersion}`;
    },
    shouldShow(): boolean {
      return this.licensesInitialized && this.paidButCommunity;
    },
    rootBindings() {
      return [{ event: AppEvent.licenseRegistered, handler: this.onLicenseRegistered }];
    },
  },
  watch: {
    shouldShow: {
      immediate: true,
      handler(show: boolean) {
        if (!show) {
          this.release();
          return;
        }
        if (SmartLocalStorage.getJSON(LICENSE_NOTICE_SEEN_KEY, null) === this.seenKey) return;
        this.show();
      },
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    async show() {
      await this.$nextTick();
      this.open = true;
      this.$modal.show(this.modalName);
    },
    /** The rows changed (key removed, or a key that unlocks arrived). */
    release() {
      if (!this.open) return;
      this.open = false;
      (this.$refs.modal as any)?.close();
    },
    /** A key was just registered; if it does not unlock the app, say so now. */
    onLicenseRegistered() {
      if (!this.paidButCommunity) return;
      this.justRegistered = true;
      this.show();
    },
    close() {
      (this.$refs.modal as any)?.close();
    },
    handleClosed() {
      if (this.open) SmartLocalStorage.addItem(LICENSE_NOTICE_SEEN_KEY, this.seenKey);
      this.open = false;
      this.justRegistered = false;
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL);
    },
    downloadCovered() {
      this.$native.openLink(RELEASES_URL + this.coveredVersion);
    },
    manageLicense() {
      this.close();
      this.$root.$emit(AppEvent.enterLicense);
    },
  },
});
</script>
