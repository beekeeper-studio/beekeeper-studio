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
    <theme-manager-modal
      ref="themeManagerModal"
      :visible="showThemeManagerModal"
      @close="closeThemeManager"
    />
    <theme-handler />
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
import ThemeHandler from "./components/theme/ThemeHandler.vue";
import {
  initializeTheme,
  setupThemeChangeListener,
} from "./components/theme/ThemeInitializer";
import ThemeManagerModal from "./components/theme/ThemeManagerModal.vue";
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
    ThemeHandler,
  },
  data() {
    return {
      url: null,
      interval: null,
      licenseInterval: null,
      runningWayland: false,
      appLoaded: false,
      showThemeManagerModal: false,
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
      async handler(newTheme) {
        if (typeof newTheme === "string") {
          localStorage.setItem("activeTheme", newTheme);
        } else if (newTheme && newTheme.themeId) {
          localStorage.setItem("activeTheme", newTheme.themeId);
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
      this.appLoaded = true;

      // Initialize settings from database first
      await this.$store.dispatch("settings/initializeSettings");

      // Initialize theme from localStorage and database
      const themeFromStore = this.$store.getters["settings/themeValue"];
      const themeFromLocalStorage = localStorage.getItem("activeTheme");

      console.log("[App] Theme from store:", themeFromStore);
      console.log("[App] Theme from localStorage:", themeFromLocalStorage);

      // If we have both values and they don't match, prioritize localStorage
      // and update the database to keep them in sync
      if (
        themeFromStore &&
        themeFromLocalStorage &&
        themeFromStore !== themeFromLocalStorage
      ) {
        console.log(
          `[App] Theme mismatch detected. Syncing database with localStorage value: ${themeFromLocalStorage}`
        );
        this.$store
          .dispatch("settings/save", {
            key: "theme",
            value: themeFromLocalStorage,
          })
          .catch((err) => {
            console.error("[App] Error syncing theme with database:", err);
          });
      }
      // If we only have a database value, update localStorage
      else if (themeFromStore && !themeFromLocalStorage) {
        console.log(
          `[App] Setting localStorage theme from database: ${themeFromStore}`
        );
        localStorage.setItem("activeTheme", themeFromStore);
      }
      // If we only have localStorage but no database value, update database
      else if (!themeFromStore && themeFromLocalStorage) {
        console.log(
          `[App] Setting database theme from localStorage: ${themeFromLocalStorage}`
        );
        this.$store
          .dispatch("settings/save", {
            key: "theme",
            value: themeFromLocalStorage,
          })
          .catch((err) => {
            console.error("[App] Error syncing theme with database:", err);
          });
      }

      // Now initialize the theme
      await initializeTheme();
      setupThemeChangeListener();

      this.$store.dispatch("licenses/updateAll");
      this.interval = setInterval(this.notifyFreeTrial, 1000 * 60 * 60 * 24);
      this.licenseInterval = setInterval(
        () => this.$store.dispatch("licenses/updateAll"),
        1000 * 60 * 60 * 24
      );
    } catch (error) {
      console.error("Error in App.vue mounted hook:", error);
    }
  },
  methods: {
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
    databaseSelected(db) {
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
    showThemeManager() {
      this.showThemeManagerModal = true;
    },
    closeThemeManager() {
      this.showThemeManagerModal = false;
    },
  },
});
</script>

<style>
/* Add any relevant styles here */
</style>
