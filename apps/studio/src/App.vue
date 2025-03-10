<template>
  <div class="style-wrapper">
    <div
      class="beekeeper-studio-wrapper"
      :class="{ 'beekeeper-studio-minimal-mode': $store.getters.minimalMode }"
    >
      <titlebar />
      <template v-if="storeInitialized">
        <!-- TODO (@day): need to come up with a better way to check this. Just set a 'connected' flag? -->
        <connection-interface v-if="!connected" />
        <core-interface @databaseSelected="databaseSelected" v-else />
        <auto-updater />
        <state-manager />
        <notification-manager />
        <upgrade-required-modal />
      </template>
    </div>
    <portal-target name="menus" multiple />
    <portal-target name="modals" multiple />
    <dropzone />
    <data-manager />
    <configuration-warning-modal />
    <enter-license-modal />
    <workspace-sign-in-modal />
    <workspace-create-modal />
    <workspace-rename-modal />
    <import-queries-modal />
    <import-connections-modal />
    <confirmation-modal-manager />
    <util-died-modal />
    <template v-if="licensesInitialized">
      <trial-expired-modal />
      <license-expired-modal />
      <lifetime-license-expired-modal />
    </template>
    <theme-manager-modal v-if="appLoaded" />
  </div>
</template>

<script lang="ts">
// @ts-nocheck
import ConfigurationWarningModal from "@/components/ConfigurationWarningModal.vue";
import querystring from "query-string";
import Vue from "vue";
import { mapGetters, mapState } from "vuex";
import AutoUpdater from "./components/AutoUpdater.vue";
import ConnectionInterface from "./components/ConnectionInterface.vue";
import CoreInterface from "./components/CoreInterface.vue";
import DataManager from "./components/data/DataManager.vue";
import StateManager from "./components/quicksearch/StateManager.vue";
import Titlebar from "./components/Titlebar.vue";

import { SmartLocalStorage } from "@/common/LocalStorage";
import ConfirmationModalManager from "@/components/common/modals/ConfirmationModalManager.vue";
import ImportConnectionsModal from "@/components/data/ImportConnectionsModal.vue";
import ImportQueriesModal from "@/components/data/ImportQueriesModal.vue";
import WorkspaceCreateModal from "@/components/data/WorkspaceCreateModal.vue";
import WorkspaceRenameModal from "@/components/data/WorkspaceRenameModal.vue";
import WorkspaceSignInModal from "@/components/data/WorkspaceSignInModal.vue";
import Dropzone from "@/components/Dropzone.vue";
import LicenseExpiredModal from "@/components/license/LicenseExpiredModal.vue";
import LifetimeLicenseExpiredModal from "@/components/license/LifetimeLicenseExpiredModal.vue";
import TrialExpiredModal from "@/components/license/TrialExpiredModal.vue";
import UtilDiedModal from "@/components/UtilDiedModal.vue";
import TimeAgo from "javascript-time-ago";
import Noty from "noty";
import { AppEvent } from "./common/AppEvent";
import globals from "./common/globals";
import NotificationManager from "./components/NotificationManager.vue";
import ThemeManagerModal from "./components/settings/ThemeManagerModal.vue";
import EnterLicenseModal from "./components/ultimate/EnterLicenseModal.vue";
import UpgradeRequiredModal from "./components/upsell/UpgradeRequiredModal.vue";

import rawLog from "@bksLogger";

const log = rawLog.scope("app.vue");

export default Vue.extend({
  name: "App",
  components: {
    CoreInterface,
    ConnectionInterface,
    Titlebar,
    AutoUpdater,
    NotificationManager,
    StateManager,
    DataManager,
    UpgradeRequiredModal,
    ConfirmationModalManager,
    Dropzone,
    UtilDiedModal,
    WorkspaceSignInModal,
    ImportQueriesModal,
    ImportConnectionsModal,
    EnterLicenseModal,
    TrialExpiredModal,
    LicenseExpiredModal,
    LifetimeLicenseExpiredModal,
    WorkspaceCreateModal,
    WorkspaceRenameModal,
    ConfigurationWarningModal,
    ThemeManagerModal,
  },
  data() {
    return {
      url: null,
      interval: null,
      licenseInterval: null,
      runningWayland: false,
      appLoaded: false,
    };
  },
  computed: {
    activeLicense() {
      return (
        this.$config.isDevelopment || (this.license && this.license.active)
      );
    },
    ...mapState(["storeInitialized", "connected", "database"]),
    ...mapState("licenses", {
      status: (state) => state.status,
      licensesInitialized: (state) => state.initialized,
    }),
    ...mapGetters({
      isTrial: "isTrial",
      isUltimate: "isUltimate",
      themeValue: "settings/themeValue",
    }),
  },
  watch: {
    database() {
      log.info("database changed", this.database);
    },
    themeValue: {
      handler(newTheme) {
        if (typeof newTheme === "string") {
          this.applyThemeCSS(newTheme);
        } else if (newTheme && newTheme.themeId) {
          this.applyThemeCSS(
            newTheme.themeId,
            newTheme.css,
            newTheme.baseTheme
          );
        }
      },
      immediate: true,
    },
    status(curr, prev) {
      this.$store.dispatch("updateWindowTitle");
      this.validateLicenseExpiry(curr, prev);
    },
    async licensesInitialized(initialized) {
      if (initialized) {
        await this.$nextTick();
        this.validateLicenseExpiry();
      }
    },
  },
  async beforeDestroy() {
    clearInterval(this.interval);
    clearInterval(this.licenseInterval);
  },
  async mounted() {
    try {
      this.notifyFreeTrial();
      this.interval = setInterval(
        this.notifyFreeTrial,
        globals.trialNotificationInterval
      );
      this.$store.dispatch("licenses/updateAll");
      this.licenseInterval = setInterval(
        () => this.$store.dispatch("licenses/updateAll"),
        globals.licenseCheckInterval
      );
      await this.$store.dispatch("settings/initializeSettings");
      if (this.themeValue) {
        if (typeof this.themeValue === "string") {
          this.applyThemeCSS(this.themeValue);
        } else if (this.themeValue.themeId) {
          this.applyThemeCSS(
            this.themeValue.themeId,
            this.themeValue.css,
            this.themeValue.baseTheme
          );
        }
      }
      const query = querystring.parse(window.location.search, {
        parseBooleans: true,
      });
      if (query) {
        this.url = query.url || null;
        this.runningWayland = !!query.runningWayland;
      }
      this.$nextTick(() => {
        window.main.isReady();
        setTimeout(() => {
          this.appLoaded = true;
          if (this.themeValue) {
            if (typeof this.themeValue === "string") {
              this.applyThemeCSS(this.themeValue);
            } else if (this.themeValue.themeId) {
              this.applyThemeCSS(
                this.themeValue.themeId,
                this.themeValue.css,
                this.themeValue.baseTheme
              );
            }
          }
        }, 1000);
      });
      if (this.url) {
        try {
          await this.$store.dispatch("openUrl", this.url);
        } catch (error) {
          console.error(error);
          this.$noty.error(`Error opening ${this.url}: ${error}`);
          throw error;
        }
      }
    } catch (error) {
      console.error("Error in App.vue mounted hook:", error);
    }
  },
  methods: {
    applyThemeCSS(themeId, cssContent, baseTheme) {
      document.body.className = `theme-${themeId}`;
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.invoke("themes/apply", {
          name: themeId,
          css: cssContent,
          baseTheme,
        });
      }
      if (cssContent) {
        const style = document.createElement("style");
        style.id = `theme-css-${themeId}`;
        style.textContent = cssContent;
        document
          .querySelectorAll('style[id^="theme-css-"]')
          .forEach((existingStyle) => {
            existingStyle.remove();
          });
        document.head.appendChild(style);
      }
    },
    notifyFreeTrial() {
      Noty.closeAll("trial");
      if (this.isTrial && this.isUltimate) {
        const ta = new TimeAgo("en-US");
        const validUntil = this.status.license.validUntil;
        const options = {
          text: `Your free trial expires ${ta.format(
            validUntil
          )} (${validUntil.toLocaleDateString()})`,
          type: "warning",
          closeWith: ["button"],
          layout: "bottomRight",
          timeout: false,
          queue: "trial",
          buttons: [
            Noty.button("Buy a License", "btn btn-flat", () => {
              window.location.href = "https://beekeeperstudio.io/pricing";
            }),
            Noty.button("Enter License", "btn btn-primary", () => {
              this.$root.$emit(AppEvent.enterLicense);
            }),
          ],
        };
        const n = new Noty(options);
        n.show();
      }
    },
    databaseSelected(_db) {
      // TODO: do something here if needed
    },
    validateLicenseExpiry(curr, prev) {
      if (SmartLocalStorage.getBool("expiredLicenseEventsEmitted", false))
        return;
      const compare = prev && curr;
      const isValidDateExpired = compare
        ? !prev.isValidDateExpired && curr.isValidDateExpired
        : this.status.isValidDateExpired;
      const isSupportDateExpired = compare
        ? !prev.isSupportDateExpired && curr.isSupportDateExpired
        : this.status.isSupportDateExpired;
      const status = compare ? curr : this.status;
      if (curr?.fromFile && curr?.noLicenseKey) {
        this.$noty.error(
          `Something is wrong with your license file: ${curr?.condition.join(
            ", "
          )}`
        );
      }
      if (isValidDateExpired) {
        this.$root.$emit(AppEvent.licenseValidDateExpired, status);
      }
      if (isSupportDateExpired) {
        this.$root.$emit(AppEvent.licenseSupportDateExpired, status);
      }
      if (isValidDateExpired || isSupportDateExpired) {
        this.$root.$emit(AppEvent.licenseExpired, status);
        SmartLocalStorage.setBool("expiredLicenseEventsEmitted", true);
      }
    },
  },
});
</script>

<style>
/* Add any relevant styles here */
</style>
