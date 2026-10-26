<template>
  <base-modal
    ref="modal"
    :name="modalName"
    :closable="false"
    first-focusable=".btn-primary"
    @submit="buyLicense"
  >
    <template #title>
      <i class="material-icons">update</i>
      This version isn't covered by your license
    </template>

    <div class="trial-modal lifetime-version">
      <p class="trial-modal-lead">
        Your license includes lifetime access to paid features in version {{ coveredVersion }} and earlier.
        This is version {{ appVersion }}, so those features are locked and the app runs as the Community Edition.
      </p>

      <ul class="lifetime-version-options">
        <li>
          <i class="material-icons">shopping_cart</i>
          <span>
            <strong>Buy a new license</strong> to unlock this version and every update after it.
          </span>
        </li>
        <li>
          <i class="material-icons">history</i>
          <span>
            <strong>Install version {{ coveredVersion }}</strong> to keep every paid feature under the current license.
            <a
              href="#"
              class="lifetime-version-download"
              @click.prevent="openDownload"
            >Download {{ coveredVersion }}</a>
          </span>
        </li>
        <li>
          <i class="material-icons">lock_open</i>
          <span>
            <strong>Use the Community Edition</strong> on this version. A license key can be entered at any time.
          </span>
        </li>
      </ul>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn btn-flat lifetime-version-continue"
        @click.prevent="continueWithCommunity"
      >
        Use Community Edition
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
        class="btn btn-primary lifetime-version-buy"
      >
        Buy a new license
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent } from "@/common/AppEvent";
import { SmartLocalStorage } from "@/common/LocalStorage";
import {
  acknowledgeLifetimeVersionNotice,
  coveredReleaseUrl,
  getAcknowledgedLifetimeVersionNotice,
  lifetimeVersionNoticeId,
  LIFETIME_VERSION_NOTICE_KEY,
} from "@/lib/lifetimeVersion";

const PRICING_URL = "https://www.beekeeperstudio.io/pricing";

/**
 * For lifetime licenses that stop short of the running version. A lapsed
 * subscription keeps every release up to its last one, so the license is
 * still good, just not for this build, which runs as the Community Edition.
 * This dialog says so, once per license and coverage boundary, and names the
 * ways out: buy a new license (a lapsed subscription cannot be reactivated),
 * install the last covered release, or carry on as Community. It never
 * offers a downgrade; there is nothing to give up.
 *
 * Like TrialEndedModal it has no close button: "Use Community Edition" is
 * the acknowledgement. It is shared between the app's windows
 * through localStorage, so answering in one closes the rest.
 */
export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "lifetime-version-not-covered-modal",
      // Mirrors the stored acknowledgement; refreshed when another window writes it.
      acknowledgedNotice: getAcknowledgedLifetimeVersionNotice(),
      open: false,
      stopWatchingStorage: null as (() => void) | null,
    };
  },
  computed: {
    ...mapState("licenses", {
      licensesInitialized: (state: any) => state.initialized,
      licenseStatus: (state: any) => state.status,
    }),
    ...mapGetters("licenses", ["isLifetimeVersionNotCovered"]),
    noticeId(): string | null {
      return lifetimeVersionNoticeId(this.licenseStatus?.license);
    },
    acknowledged(): boolean {
      return this.noticeId !== null && this.acknowledgedNotice === this.noticeId;
    },
    shouldShow(): boolean {
      return this.licensesInitialized && this.isLifetimeVersionNotCovered && !this.acknowledged;
    },
    coveredTag(): string | null {
      return this.licenseStatus?.license?.maxAllowedAppRelease?.tagName ?? null;
    },
    /** "5.2.3": the last release the license covers. */
    coveredVersion(): string {
      const version = this.licenseStatus?.maxAllowedVersion;
      if (version && typeof version.major === "number") {
        return `${version.major}.${version.minor}.${version.patch}`;
      }
      return this.coveredTag?.replace(/^v/, "") ?? "";
    },
    appVersion(): string {
      return this.$config?.appVersion ?? "";
    },
  },
  watch: {
    shouldShow: {
      immediate: true,
      handler(show: boolean) {
        if (show) {
          this.show();
        } else if (this.open) {
          // The license now covers this version (a new key was entered), or
          // another window acknowledged the notice.
          this.release();
        }
      },
    },
  },
  created() {
    this.stopWatchingStorage = SmartLocalStorage.onChange(LIFETIME_VERSION_NOTICE_KEY, () => {
      this.acknowledgedNotice = getAcknowledgedLifetimeVersionNotice();
    });
  },
  beforeDestroy() {
    this.stopWatchingStorage?.();
    if (this.open) this.$store.commit("licenses/setBlockingDialog", null);
  },
  methods: {
    async show() {
      this.open = true;
      this.$store.commit("licenses/setBlockingDialog", this.modalName);
      // The immediate watcher runs before the <modal> inside the portal is
      // mounted, and vue-js-modal drops a show() nobody is listening for.
      await this.$nextTick();
      if (!this.open) return;
      this.$modal.show(this.modalName);
    },
    /** Close without recording anything: the license status, or another window, has answered. */
    release() {
      this.open = false;
      this.$store.commit("licenses/setBlockingDialog", null);
      (this.$refs.modal as any)?.close();
    },
    continueWithCommunity() {
      if (this.noticeId !== null) {
        acknowledgeLifetimeVersionNotice(this.noticeId);
        this.acknowledgedNotice = this.noticeId;
      }
      this.release();
    },
    enterLicense() {
      this.$root.$emit(AppEvent.enterLicense);
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL);
    },
    openDownload() {
      this.$native.openLink(coveredReleaseUrl(this.coveredTag));
    },
  },
});
</script>
