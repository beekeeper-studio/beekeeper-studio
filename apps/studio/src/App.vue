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
import type { LicenseStatus } from "@/lib/license";
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
        console.log("Theme value changed in App.vue:", newTheme);

        if (typeof newTheme === "string") {
          // Handle string theme ID
          this.applyThemeCSS(newTheme);
        } else if (newTheme && newTheme.themeId) {
          // Handle object with themeId and possibly CSS
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

      // Initialize settings
      await this.$store.dispatch("settings/initializeSettings");

      // Ensure themes are loaded
      await this.$store.dispatch("themes/fetchThemes");

      // Initialize themes (ensure this happens after settings are loaded)
      if (this.themeValue) {
        console.log(`Initializing theme: ${this.themeValue}`);

        // Apply the theme directly
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

      // Listen for theme preview changes from ThemeManagerModal
      this.$root.$on("theme-preview-changed", (payload) => {
        console.log(
          "Theme preview changed event received in App.vue:",
          payload
        );

        if (typeof payload === "string") {
          // Handle legacy format (just themeId)
          this.applyThemeCSS(payload);
        } else if (payload && payload.themeId) {
          // Handle new format with CSS content
          this.applyThemeCSS(payload.themeId, payload.css, payload.baseTheme);
        }
      });

      // Also listen for window events
      window.addEventListener("theme-preview", (event) => {
        console.log(
          "Theme preview window event received in App.vue:",
          event.detail
        );

        if (event.detail && event.detail.themeId) {
          this.applyThemeCSS(
            event.detail.themeId,
            event.detail.css,
            event.detail.baseTheme
          );
        }
      });

      const query = querystring.parse(window.location.search, {
        parseBooleans: true,
      });
      if (query) {
        this.url = query.url || null;
        this.runningWayland = !!query.runningWayland;
      }

      this.$nextTick(() => {
        window.main.isReady();
        // Set appLoaded to true after a short delay to ensure the app is fully initialized
        setTimeout(() => {
          this.appLoaded = true;

          // Re-apply the theme after ThemeManagerModal is loaded
          if (this.themeValue) {
            console.log(
              "Re-applying theme after ThemeManagerModal is loaded:",
              this.themeValue
            );
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
      console.log(`App.vue: Applying theme CSS for ${themeId}`);

      // Get the theme from the store
      const theme = this.$store.getters["themes/allThemes"].find(
        (t) => t.id === themeId
      );

      if (!theme) {
        console.error(`App.vue: Theme not found in store: ${themeId}`);
        return;
      }

      // Special handling for built-in themes that have their own SCSS files
      const baseThemes = [
        "dark",
        "light",
        "solarized-dark",
        "solarized",
        "system",
      ];
      if (baseThemes.includes(themeId)) {
        console.log(`App.vue: Using built-in theme structure for ${themeId}`);

        // Remove any existing theme styles and links
        document.querySelectorAll('link[id^="theme-css-"]').forEach((link) => {
          link.remove();
        });
        document
          .querySelectorAll(
            'style[id^="theme-style-"], style[id^="fallback-theme-"], style[id^="theme-css-"]'
          )
          .forEach((style) => {
            style.remove();
          });

        // Remove any custom theme classes
        document.body.className = "";
        document.body.classList.forEach((cls) => {
          if (cls.startsWith("theme-custom-")) {
            document.body.classList.remove(cls);
          }
        });

        // Set the body class directly, this will trigger the CSS imports in app.scss
        document.body.className = `theme-${themeId}`;

        // If we're in an electron environment, notify about the theme change
        if (window.electron && window.electron.ipcRenderer) {
          console.log(
            `App.vue: Notifying electron about built-in theme: ${themeId}`
          );
          window.electron.ipcRenderer.send(AppEvent.settingsChanged, {
            key: "theme",
            value: themeId,
          });
        }

        return;
      }

      // For non-built-in themes, we use the dark theme as a base structure
      // and apply color overrides using custom classes
      console.log(
        `App.vue: Applying non-built-in theme ${themeId} with baseTheme ${
          baseTheme || "dark"
        }`
      );

      // Remove any existing theme links and style elements
      document.querySelectorAll('link[id^="theme-css-"]').forEach((link) => {
        link.remove();
      });
      document
        .querySelectorAll(
          'style[id^="theme-style-"], style[id^="fallback-theme-"], style[id^="theme-css-"]'
        )
        .forEach((style) => {
          style.remove();
        });

      // Remove any custom theme classes
      document.body.classList.forEach((cls) => {
        if (cls.startsWith("theme-custom-")) {
          document.body.classList.remove(cls);
        }
      });

      // Set primary class to dark theme for structure
      document.body.className = "theme-dark";

      // Add the custom theme class for our specific theme
      document.body.classList.add(`theme-custom-${themeId}`);

      // Apply the CSS overrides for this theme
      if (cssContent) {
        console.log("App.vue: Applying provided CSS overrides");
        const styleElement = document.createElement("style");
        styleElement.id = `theme-style-${themeId}`;
        styleElement.textContent = cssContent;
        document.head.appendChild(styleElement);
      } else if (this.$root.$children) {
        // Try to find ThemeManagerModal to generate CSS
        const themeManager = this.$root.$children.find(
          (c) => c.$options && c.$options.name === "ThemeManagerModal"
        );
        if (
          themeManager &&
          typeof themeManager.generateThemeColorOverrides === "function"
        ) {
          console.log(
            "App.vue: Using ThemeManagerModal to generate color overrides"
          );
          const generatedCSS = themeManager.generateThemeColorOverrides(theme);
          const styleElement = document.createElement("style");
          styleElement.id = `theme-style-${themeId}`;
          styleElement.textContent = generatedCSS;
          document.head.appendChild(styleElement);
        } else {
          console.log(
            "App.vue: Could not find ThemeManagerModal, using basic color overrides"
          );
          this.applyBasicColorOverrides(theme);
        }
      } else {
        console.log(
          "App.vue: No ThemeManagerModal available, using basic color overrides"
        );
        this.applyBasicColorOverrides(theme);
      }

      // If we're in an electron environment, notify about the theme change
      if (window.electron && window.electron.ipcRenderer) {
        console.log(
          `App.vue: Notifying electron about theme change: ${themeId}`
        );
        window.electron.ipcRenderer.send(AppEvent.settingsChanged, {
          key: "theme",
          value: themeId,
          css:
            cssContent ||
            document.querySelector(`style[id^="theme-style-${themeId}"]`)
              ?.textContent,
          baseTheme: "dark",
        });
      }
    },
    applyBasicColorOverrides(theme) {
      const themeId = theme.id;
      const bg = theme.colors.background;
      const fg = theme.colors.foreground;
      const string = theme.colors.string;
      const keyword = theme.colors.keyword;

      // Helper function to adjust colors
      const adjustColor = (color, amount) => {
        let usePound = false;

        if (color[0] === "#") {
          color = color.slice(1);
          usePound = true;
        }

        const num = parseInt(color, 16);

        let r = (num >> 16) + amount;
        r = Math.max(Math.min(r, 255), 0);

        let g = ((num >> 8) & 0x00ff) + amount;
        g = Math.max(Math.min(g, 255), 0);

        let b = (num & 0x0000ff) + amount;
        b = Math.max(Math.min(b, 255), 0);

        return (
          (usePound ? "#" : "") +
          (g | (r << 8) | (b << 16)).toString(16).padStart(6, "0")
        );
      };

      // Create minimal color overrides targeted at our combined classes
      const cssContent = `
        /* Basic color overrides for theme: ${theme.name} */
        .theme-dark.theme-custom-${themeId} {
          --theme-bg: ${bg} !important;
          --theme-base: ${fg} !important;
          --theme-string: ${string} !important;
          --theme-keyword: ${keyword} !important;
          --theme-primary: ${keyword} !important;
          --theme-secondary: ${adjustColor(keyword, -20)} !important;
        }
        
        .theme-dark.theme-custom-${themeId} body {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .beekeeper-studio-wrapper {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        /* Extra styling for key elements */
        .theme-dark.theme-custom-${themeId} .sidebar {
          background-color: ${adjustColor(bg, -15)} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .editor {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
      `;

      // Create and apply the style
      const style = document.createElement("style");
      style.id = `theme-style-${themeId}`;
      style.textContent = cssContent;
      document.head.appendChild(style);
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
    validateLicenseExpiry(curr?: LicenseStatus, prev?: LicenseStatus) {
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
