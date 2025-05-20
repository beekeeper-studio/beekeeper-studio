<template>
  <div id="theme-manager-container">
    <div
      ref="modalRoot"
      class="theme-manager-modal"
      :style="{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: computedVisible ? 'block' : 'none',
        visibility: computedVisible ? 'visible' : 'hidden',
        opacity: computedVisible ? '1' : '0',
        zIndex: computedVisible ? '9999' : '-1',
        transition: 'opacity 0.3s ease-in-out',
      }"
    >
      <div class="theme-manager-modal-overlay" @click.self="close">
        <div class="theme-manager-modal-content">
          <div class="theme-manager-modal-header">
            <h3>Available Themes</h3>
            <button class="close-button" @click="close">×</button>
          </div>

          <div class="theme-manager-modal-body">
            <div class="tabs">
              <button
                :class="['tab-button', { active: activeTab === 'popular' }]"
                @click="activeTab = 'popular'"
              >
                Available Themes
              </button>
            </div>

            <div v-if="activeTab === 'popular'" class="tab-content">
              <div v-if="loading" class="loading">Loading themes...</div>
              <div v-else-if="error" class="error">
                {{ error }}
              </div>
              <div v-else class="theme-grid">
                <theme-preview-card
                  v-for="theme in filteredThemes"
                  :key="theme.id"
                  :theme="theme"
                  :is-active="theme.id === selectedTheme.id"
                  @select="applyTheme"
                />
              </div>
            </div>

            <div v-if="activeTab === 'all'" class="tab-content">
              <div v-if="loading" class="loading">Loading themes...</div>
              <div v-else-if="error" class="error">
                {{ error }}
              </div>
              <div v-else class="theme-grid">
                <theme-preview-card
                  v-for="theme in filteredThemes"
                  :key="theme.id"
                  :theme="theme"
                  :is-active="theme.id === selectedTheme.id"
                  @select="applyTheme"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { AppEvent } from "@/common/AppEvent";
import { initializeTheme } from "@/components/theme/ThemeInitializer";
import ThemePreviewCard from "@/components/theme/ThemePreviewCard.vue";
import { mapGetters, mapState } from "vuex";
import "./theme-manager-modal.scss";

let MODAL_INSTANCE = null;

function getThemeVariables(themeName) {
  const baseVariables = {
    "--theme-active": themeName,
  };

  switch (themeName) {
    case "dark":
      return {
        ...baseVariables,
        "--theme-bg": "#252525",
        "--theme-base": "#ffffff",
        "--theme-string": "#a5d6ff",
        "--theme-keyword": "#ff7b72",
        "--theme-primary": "#ff7b72",
        "--theme-secondary": "#4ad0ff",
        "--border-color": "rgba(255, 255, 255, 0.1)",
        "--sidebar-bg": "#1e1e1e",
      };
    case "light":
      return {
        ...baseVariables,
        "--theme-bg": "#f5f5f5",
        "--theme-base": "#24292e",
        "--theme-string": "#032f62",
        "--theme-keyword": "#d73a49",
        "--theme-primary": "#d73a49",
        "--theme-secondary": "#032f62",
        "--border-color": "rgba(0, 0, 0, 0.1)",
        "--sidebar-bg": "#ececec",
      };
    case "solarized-dark":
      return {
        ...baseVariables,
        "--theme-bg": "#002b36",
        "--theme-base": "#93a1a1",
        "--theme-string": "#2aa198",
        "--theme-keyword": "#cb4b16",
        "--theme-primary": "#cb4b16",
        "--theme-secondary": "#b58900",
        "--border-color": "rgba(147, 161, 161, 0.1)",
        "--sidebar-bg": "#073642",
      };
    case "solarized-light":
      return {
        ...baseVariables,
        "--theme-bg": "#fdf6e3",
        "--theme-base": "#657b83",
        "--theme-string": "#2aa198",
        "--theme-keyword": "#cb4b16",
        "--theme-primary": "#cb4b16",
        "--theme-secondary": "#b58900",
        "--border-color": "rgba(101, 123, 131, 0.1)",
        "--sidebar-bg": "#eee8d5",
      };
    default:
      return baseVariables;
  }
}

export default {
  name: "ThemeManagerModal",
  components: {
    ThemePreviewCard,
  },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    console.log("[ThemeManagerModal] data() initialization");
    return {
      isVisible: false,
      activeTab: "popular",
      loading: true,
      error: null,
      themes: [],
      selectedTheme: null,
      previewedThemeId: null,
      activeTheme: null,
      selectedFile: null,
      uploadError: null,
      importing: false,
      searchQuery: "",
      eventCheckInterval: null,
      isInitialized: false,
    };
  },
  computed: {
    ...mapState({
      currentTheme: (state) => state.settings.theme,
    }),
    ...mapGetters({
      themeValue: "settings/themeValue",
    }),
    computedVisible() {
      const result = this.visible || this.isVisible;
      console.log(
        `[ThemeManagerModal] computedVisible: prop=${this.visible}, internal=${this.isVisible}, result=${result}`
      );
      return result;
    },
    filteredThemes() {
      let filtered = [];

      if (this.activeTab === "popular") {
        filtered = this.themes.filter((theme) => !theme.custom);
      } else if (this.activeTab === "custom") {
        filtered = this.themes.filter((theme) => theme.custom);
      } else {
        filtered = this.themes;
      }

      // apply search filter if search is active
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (theme) =>
            theme.name.toLowerCase().includes(query) ||
            (theme.description &&
              theme.description.toLowerCase().includes(query))
        );
      }

      return filtered;
    },
  },
  watch: {
    visible: {
      immediate: true,
      handler(newValue, oldValue) {
        console.log(
          `[ThemeManagerModal] visible prop changed: ${oldValue} -> ${newValue}`
        );
        if (newValue) {
          this.handleVisibilityChange(true);
        } else if (oldValue && !newValue) {
          console.log("[ThemeManagerModal] visible prop changed to false");
          this.handleVisibilityChange(false);
        }
      },
    },
    // Watch the Vuex store's theme manager visibility state
    "$store.state.theme.showThemeManager": {
      immediate: true,
      handler(newValue) {
        console.log(
          `[ThemeManagerModal] Vuex store theme.showThemeManager changed to: ${newValue}`
        );
        if (newValue) {
          this.handleVisibilityChange(true);

          // Clear the Vuex state after showing the modal
          setTimeout(() => {
            this.$store.dispatch("theme/hideThemeManager");
          }, 100);
        }
      },
    },
  },
  created() {
    console.log("[ThemeManagerModal] Component created");

    // Store instance reference as early as possible
    MODAL_INSTANCE = this;
    console.log("[ThemeManagerModal] Modal instance set in created hook");

    // Set up global access to show method
    if (typeof window !== "undefined") {
      // Re-assign to make sure we're using this instance
      window.showThemeManagerModal = this.showModal.bind(this);
    }
  },
  mounted() {
    MODAL_INSTANCE = this;
    this.setupEventListeners();
    this.loadThemes().then(() => {
      this.isInitialized = true;

      if (this.visible) {
        this.handleVisibilityChange(true);
      }

      this.checkPendingEvents();
    });
  },
  beforeDestroy() {
    if (this.themeManagerUnsubscribe) {
      this.themeManagerUnsubscribe();
    }
    if (this.globalEventUnsubscribe) {
      this.globalEventUnsubscribe();
    }
    if (this.domHandlers) {
      this.domHandlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    }

    this.$root.$off("show-theme-manager", this.handleShowEvent);

    if (this.eventCheckInterval) {
      clearInterval(this.eventCheckInterval);
    }
  },
  methods: {
    handleVisibilityChange(isVisible) {
      this.isVisible = isVisible;

      if (isVisible) {
        this.ensureModalStyles();

        const modalElement = this.$refs.modalRoot;
        if (modalElement) {
          modalElement.style.display = "block";
          modalElement.style.visibility = "visible";
          modalElement.style.opacity = "1";
          modalElement.style.zIndex = "9999";
        }

        try {
          if (
            window.themeManager &&
            typeof window.themeManager.confirmAction === "function"
          ) {
            window.themeManager.confirmAction({
              action: "show",
              success: true,
              responseToId:
                localStorage.getItem("themeManagerCommandId") || "unknown",
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          console.error("[ThemeManagerModal] Error confirming action:", err);
        }
      } else {
        const modalElement = this.$refs.modalRoot;
        if (modalElement) {
          modalElement.style.opacity = "0";
          modalElement.style.visibility = "hidden";
          modalElement.style.display = "none";
          modalElement.style.zIndex = "-1";
        }
      }

      if (!isVisible) {
        this.$emit("close");
      }
    },

    setupEventListeners() {
      this.domHandlers = [];

      const events = [
        "show-theme-manager",
        "show-theme-manager-modal",
        "theme-manager:show",
        "theme-manager-action",
      ];

      events.forEach((eventName) => {
        const handler = (event) => {
          this.showModal();
        };

        window.addEventListener(eventName, handler);
        this.domHandlers.push({ event: eventName, handler });
        console.log(`[ThemeManagerModal] Added DOM listener for ${eventName}`);
      });

      // APPROACH 2: Listen for Vue events
      this.$root.$on("show-theme-manager", this.handleShowEvent);
      console.log("[ThemeManagerModal] Added Vue root listener");

      // APPROACH 3: Listen for dedicated themeManager API events (from preload)
      try {
        if (
          window.themeManager &&
          typeof window.themeManager.onAction === "function"
        ) {
          console.log(
            "[ThemeManagerModal] Using dedicated themeManager API from preload"
          );

          this.themeManagerUnsubscribe = window.themeManager.onAction(
            (data) => {
              console.log(
                "[ThemeManagerModal] Received themeManager action:",
                data
              );
              if (data.action === "show") {
                this.showModal();

                // Confirm receipt back to main process
                if (typeof window.themeManager.confirmAction === "function") {
                  window.themeManager.confirmAction({
                    action: "show",
                    success: true,
                    responseToId:
                      data.id ||
                      localStorage.getItem("themeManagerCommandId") ||
                      "unknown",
                    timestamp: Date.now(),
                  });
                }
              }
            }
          );

          console.log(
            "[ThemeManagerModal] themeManager API listener registered"
          );
        } else {
          console.log(
            "[ThemeManagerModal] window.themeManager is not available - using fallbacks"
          );
        }
      } catch (err) {
        console.error(
          "[ThemeManagerModal] Error setting up themeManager API:",
          err
        );
      }

      // APPROACH 4: Listen for globalEvent API events (from preload)
      try {
        if (window.globalEvent && typeof window.globalEvent.on === "function") {
          console.log("[ThemeManagerModal] Using globalEvent API from preload");

          this.globalEventUnsubscribe = window.globalEvent.on(
            "show-theme-manager",
            (data) => {
              console.log("[ThemeManagerModal] Received global event:", data);
              this.showModal();
            }
          );

          console.log(
            "[ThemeManagerModal] globalEvent API listener registered"
          );
        }
      } catch (err) {
        console.error(
          "[ThemeManagerModal] Error setting up globalEvent API:",
          err
        );
      }

      // APPROACH 5: Listen for Electron IPC events if available
      try {
        if (window.electron && window.electron.ipcRenderer) {
          console.log("[ThemeManagerModal] Setting up IPC listeners");

          [
            "show-theme-manager-modal",
            "show-theme-manager",
            AppEvent.showThemeManager,
          ].forEach((channel) => {
            window.electron.ipcRenderer.on(channel, () => {
              console.log(`[ThemeManagerModal] Received IPC event: ${channel}`);
              this.showModal();
            });
            console.log(
              `[ThemeManagerModal] Added IPC listener for ${channel}`
            );
          });
        } else {
          console.log(
            "[ThemeManagerModal] window.electron.ipcRenderer not available"
          );
        }
      } catch (err) {
        console.error(
          "[ThemeManagerModal] Error setting up IPC listeners:",
          err
        );
      }

      this.eventCheckInterval = setInterval(() => {
        this.checkPendingEvents();
      }, 1000);
    },

    // Handle show event from any source
    handleShowEvent() {
      console.log("[ThemeManagerModal] handleShowEvent called");
      this.showModal();
    },

    // Check for pending events in localStorage
    checkPendingEvents() {
      // Check for localStorage flags
      if (
        localStorage.getItem("pendingThemeManagerEvent") === "true" ||
        localStorage.getItem("showThemeManagerImmediately") === "true"
      ) {
        console.log("[ThemeManagerModal] Found pending event in localStorage");

        // Clear flags
        localStorage.removeItem("pendingThemeManagerEvent");
        localStorage.removeItem("showThemeManagerImmediately");

        // Show modal
        this.showModal();
      }
    },

    // Direct method to show the modal, can be called from anywhere
    showModal() {
      console.log("[ThemeManagerModal] showModal() called");
      this.handleVisibilityChange(true);
      this.$store.dispatch("theme/hideThemeManager");
      return true;
    },

    // Helper method to ensure modal styles are applied with high specificity
    ensureModalStyles() {
      let styleEl = document.getElementById("theme-manager-modal-styles");

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "theme-manager-modal-styles";
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = `
        /* Force modal visibility with !important flags */
        .theme-manager-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 10000 !important; /* Higher than anything else */
          overflow: auto !important;
        }

        /* Target specific states with attribute selectors */
        .theme-manager-modal[style*="display: none"],
        .theme-manager-modal:not([style*="display: block"]) {
          display: block !important;
        }

        /* Ensure modal is on top of everything */
        body .theme-manager-modal,
        body.modal-open .theme-manager-modal,
        #app .theme-manager-modal {
          z-index: 10000 !important;
        }

        /* Style overlay to capture clicks */
        .theme-manager-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          z-index: 10001 !important;
        }

        /* Ensure content is styled properly */
        .theme-manager-modal-content {
          background-color: var(--theme-bg, #fff) !important;
          color: var(--theme-base, #000) !important;
          border-radius: 4px !important;
          max-width: 900px !important;
          width: 90% !important;
          max-height: 90vh !important;
          overflow: auto !important;
          z-index: 10002 !important;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5) !important;
        }
      `;
    },

    close() {
      console.log("[ThemeManagerModal] Close method called");

      // Update internal state
      this.isVisible = false;

      // Update styles but preserve the element for future reopening
      const modalElement = this.$refs.modalRoot;
      if (modalElement) {
        // Only modify opacity for visual transition
        modalElement.style.opacity = "0";
        modalElement.style.visibility = "hidden";
      }

      this.resetUploadState();

      // Emit close event to parent
      this.$emit("close");

      // Also emit update for the visible prop
      this.$emit("update:visible", false);
    },
    async loadThemes() {
      try {
        this.loading = true;
        this.error = null;

        // import theme configurations
        const { defaultThemes } = await import(
          "@/components/theme/ThemeConfigurations.ts"
        );
        console.log("Loaded theme configurations:", defaultThemes.length);

        // initialize themes with default themes
        this.themes = defaultThemes.map((theme) => ({
          ...theme,
          // ensure theme has proper CSS variables
          cssVars: {
            background: theme.colors.background,
            foreground: theme.colors.foreground,
            string: theme.colors.string,
            keyword: theme.colors.keyword,
          },
        }));

        // get current theme from localStorage
        const activeThemeId = localStorage.getItem("activeTheme") || "dark";
        console.log("Current active theme ID:", activeThemeId);

        // set selected theme
        this.selectedTheme =
          this.themes.find((t) => t.id === activeThemeId) || this.themes[0];
        console.log("Selected theme:", this.selectedTheme.name);

        this.loading = false;
      } catch (error) {
        console.error("Error loading themes:", error);
        this.error = `Error loading themes: ${
          error.message || "Unknown error"
        }`;
        this.loading = false;
      }
    },
    getDefaultColorsForTheme(themeIdOrObject) {
      // extract the theme ID from theme object or use directly if it's a string
      const themeId =
        typeof themeIdOrObject === "object" && themeIdOrObject !== null
          ? themeIdOrObject.id
          : themeIdOrObject;

      // if we can't determine the theme ID, return safe defaults
      if (!themeId) {
        return {
          background: "#252525",
          foreground: "#ffffff",
          string: "#a5d6ff",
          keyword: "#ff7b72",
        };
      }

      // find the theme in our themes list
      const theme = this.themes.find((t) => t.id === themeId);
      if (theme && theme.colors) {
        return theme.colors;
      }

      // provide default colors based on theme ID/name
      const themeIdStr = String(themeId).toLowerCase();

      // dark themes detection
      const isDark =
        themeIdStr.includes("dark") ||
        [
          "dark",
          "dracula",
          "monokai",
          "shades-of-purple",
          "panda-syntax",
          "city-lights",
          "github-dark",
          "cobalt",
          "night-owl",
          "nord",
          "one-dark-pro",
          "tokyo-night",
          "catppuccin-mocha",
          "rose-pine",
          "material-theme",
          "palenight",
          "andromeda",
          "nightingale",
          "vscode-monokai-night",
          "synthwave-84",
          "github-copilot",
        ].includes(themeIdStr);

      if (isDark) {
        // check specific dark themes
        if (themeIdStr === "dracula") {
          return {
            background: "#282a36",
            foreground: "#f8f8f2",
            string: "#f1fa8c",
            keyword: "#ff79c6",
          };
        } else if (themeIdStr === "monokai") {
          return {
            background: "#272822",
            foreground: "#f8f8f2",
            string: "#e6db74",
            keyword: "#f92672",
          };
        } else if (themeIdStr === "shades-of-purple") {
          return {
            background: "#2D2B55",
            foreground: "#A599E9",
            string: "#A5FF90",
            keyword: "#FF9D00",
          };
        } else if (themeIdStr === "city-lights") {
          return {
            background: "#1d252c",
            foreground: "#b7c5d3",
            string: "#5ec4ff",
            keyword: "#ebbf83",
          };
        } else if (themeIdStr === "panda-syntax") {
          return {
            background: "#292a2b",
            foreground: "#e6e6e6",
            string: "#19f9d8",
            keyword: "#ff75b5",
          };
        } else if (themeIdStr === "solarized-dark") {
          return {
            background: "#002b36",
            foreground: "#839496",
            string: "#2aa198",
            keyword: "#cb4b16",
          };
        }

        // Default dark theme colors
        return {
          background: "#252525",
          foreground: "#ffffff",
          string: "#a5d6ff",
          keyword: "#ff7b72",
        };
      } else {
        // Check specific light themes
        if (themeIdStr === "solarized" || themeIdStr === "solarized-light") {
          return {
            background: "#fdf6e3",
            foreground: "#657b83",
            string: "#2aa198",
            keyword: "#cb4b16",
          };
        } else if (themeIdStr === "nord-light") {
          return {
            background: "#eceff4",
            foreground: "#2e3440",
            string: "#a3be8c",
            keyword: "#5e81ac",
          };
        }

        // Default light theme colors
        return {
          background: "#f5f5f5",
          foreground: "#24292e",
          string: "#032f62",
          keyword: "#d73a49",
        };
      }
    },
    // clean up theme-related elements that interfere with theme application
    cleanupThemeResiduals() {
      try {
        console.log("Cleaning up theme residuals...");

        // remove all theme-related style elementsToClean
        document
          .querySelectorAll('style[id*="theme"], style[id*="beekeeper"]')
          .forEach((el) => {
            console.log(`Removing style element: ${el.id}`);
            el.parentNode.removeChild(el);
          });

        // remove all inline theme styles from body and html elements
        const elementsToClean = [document.documentElement, document.body];
        const themeProps = [
          "--theme-active",
          "--theme-bg",
          "--theme-base",
          "--theme-string",
          "--theme-keyword",
          "--theme-primary",
          "--theme-secondary",
          "--border-color",
          "--sidebar-bg",
        ];

        elementsToClean.forEach((el) => {
          // remove all theme-related classes
          el.className = el.className
            .replace(/theme-[a-zA-Z0-9-_]+/g, "")
            .trim();

          // remove all theme-related inline styles
          themeProps.forEach((prop) => {
            el.style.removeProperty(prop);
          });
        });

        // find all elements with theme classes and remove them
        document.querySelectorAll('[class*="theme-"]').forEach((el) => {
          el.className = el.className
            .replace(/theme-[a-zA-Z0-9-_]+/g, "")
            .trim();
        });

        // reset key UI elements
        const keyElements = [
          ".sidebar-wrapper",
          ".toolbar",
          ".connection-main",
          "header",
          ".main-content",
        ];

        keyElements.forEach((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            // clear inline styles that might be theme-related
            el.removeAttribute("style");
          }
        });

        console.log("Theme residuals cleanup completed");
      } catch (error) {
        console.error("Error cleaning up theme residuals:", error);
      }
    },
    async applyTheme(theme) {
      try {
        console.log("Applying theme with ID:", theme.id);
        this.loading = true;

        // set a loading message
        this.error = null;
        this.statusMessage = `Applying ${theme.name} theme...`;

        // Store the theme in localStorage first
        this.selectedTheme = theme;
        localStorage.setItem("activeTheme", theme.id);
        console.log(
          `[ThemeManagerModal] Saved theme to localStorage: ${theme.id}`
        );

        // Apply theme class directly for immediate visual feedback
        document.body.className =
          document.body.className.replace(/theme-[a-zA-Z0-9-_]+/g, "").trim() +
          ` theme-${theme.id}`;

        document.documentElement.className =
          document.documentElement.className
            .replace(/theme-[a-zA-Z0-9-_]+/g, "")
            .trim() + ` theme-${theme.id}`;

        // Set theme-specific CSS variables based on the theme
        const themeVariables = this.getThemeVariables(theme);

        // Apply variables directly to root and body
        Object.entries(themeVariables).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
          document.body.style.setProperty(key, value);
        });

        // Also apply colors with !important for components that might not inherit properly
        this.applyThemeWithHighPriority(theme.id, themeVariables);

        // Store in Vuex store using both settings and theme modules
        try {
          // Update the settings store
          await this.$store.dispatch("settings/save", {
            key: "theme",
            value: theme.id,
          });
          console.log(
            `[ThemeManagerModal] Saved theme to settings store: ${theme.id}`
          );

          // Also dispatch to theme store using our new method
          if (this.$store) {
            try {
              await this.$store.dispatch("theme/setCurrentTheme", theme);
              console.log(
                `[ThemeManagerModal] Updated theme store with theme: ${theme.id}`
              );
            } catch (err) {
              console.error(
                `[ThemeManagerModal] Error updating theme store:`,
                err
              );
            }
          }
        } catch (err) {
          console.error(`[ThemeManagerModal] Error updating stores:`, err);
        }

        // Initialize theme via the ThemeInitializer for full application
        try {
          await initializeTheme();
          console.log("Theme initialized via ThemeInitializer");
        } catch (err) {
          console.error("Error initializing theme via ThemeInitializer:", err);
        }

        // Clear loading state after a short delay
        this.loading = false;
        this.statusMessage = `Theme ${theme.name} applied successfully!`;
        this.$emit("theme-applied", theme);
        console.log(
          `[ThemeManagerModal] Theme application completed: ${theme.id}`
        );
      } catch (err) {
        this.loading = false;
        this.error = `Error applying theme: ${err.message}`;
        console.error(`[ThemeManagerModal] Error applying theme:`, err);
      }
    },
    // Helper method to get theme variables
    getThemeVariables(theme) {
      const baseVariables = {
        "--theme-active": theme.id,
      };

      // Use theme colors from the theme object
      if (theme.colors) {
        return {
          ...baseVariables,
          "--theme-bg": theme.colors.background || "#252525",
          "--theme-base": theme.colors.foreground || "#ffffff",
          "--theme-string": theme.colors.string || "#a5d6ff",
          "--theme-keyword": theme.colors.keyword || "#ff7b72",
          "--theme-primary": theme.colors.keyword || "#ff7b72",
          "--theme-secondary": theme.colors.string || "#4ad0ff",
          "--border-color": theme.id.includes("light")
            ? "rgba(0, 0, 0, 0.1)"
            : "rgba(255, 255, 255, 0.1)",
          "--sidebar-bg": theme.id.includes("light") ? "#f5f5f5" : "#1e1e1e",
        };
      }

      // Default dark theme as fallback
      return {
        ...baseVariables,
        "--theme-bg": "#252525",
        "--theme-base": "#ffffff",
        "--theme-string": "#a5d6ff",
        "--theme-keyword": "#ff7b72",
        "--theme-primary": "#ff7b72",
        "--theme-secondary": "#4ad0ff",
        "--border-color": "rgba(255, 255, 255, 0.1)",
        "--sidebar-bg": "#1e1e1e",
      };
    },
    // Format theme name for display
    formatThemeName(themeId) {
      return themeId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    },
    // apply theme directly to DOM for immediate visual feedback
    applyThemeDirectly(themeId, colors) {
      try {
        console.log("Applying theme CSS directly:", themeId, colors);

        // remove ALL theme classes from document
        const allElements = document.querySelectorAll(
          '.theme-dark, .theme-light, [class*="theme-"]'
        );
        allElements.forEach((el) => {
          // Remove any classes that start with theme-
          el.className = el.className
            .replace(/theme-[a-zA-Z0-9-_]+/g, "")
            .trim();
        });

        // set theme class on body
        document.body.className =
          document.body.className.trim() + ` theme-${themeId}`;

        // also apply to document element for CSS variable inheritance
        document.documentElement.className =
          document.documentElement.className.trim() + ` theme-${themeId}`;

        // add theme class to app root if it exists
        const appElement = document.getElementById("app");
        if (appElement) {
          appElement.className =
            appElement.className.replace(/theme-[a-zA-Z0-9-_]+/g, "").trim() +
            ` theme-${themeId}`;
        }

        // get CSS variables from theme
        const cssVars = this.getColorsForTheme(themeId);

        // reset any previously set variables on root and body
        const allCssVars = [
          "--theme-active",
          "--theme-bg",
          "--theme-base",
          "--theme-string",
          "--theme-keyword",
          "--theme-primary",
          "--theme-secondary",
          "--border-color",
          "--sidebar-bg",
        ];

        allCssVars.forEach((varName) => {
          document.documentElement.style.removeProperty(varName);
          document.body.style.removeProperty(varName);
        });

        // apply CSS variables to root and body
        Object.entries(cssVars).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
          document.body.style.setProperty(key, value);
        });

        // create/update a style tag to ensure colors applied with !important
        this.applyThemeWithHighPriority(themeId, cssVars);

        return true;
      } catch (error) {
        console.error("Error applying theme directly:", error);
        return false;
      }
    },
    // apply theme with high priority using a style tag
    applyThemeWithHighPriority(themeId, variables) {
      // create a style element specifically for theme variables
      let styleElement = document.getElementById(
        "beekeeper-theme-manager-vars"
      );

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "beekeeper-theme-manager-vars";
        document.head.appendChild(styleElement);
      }

      // build CSS content with !important flag for priority
      let cssContent = `
        /* Theme variables for ${themeId} */
        :root {
      `;

      // add each variable with !important
      Object.entries(variables).forEach(([key, value]) => {
        cssContent += `      ${key}: ${value} !important;\n`;
      });

      cssContent += `
        }

        /* Apply to body as well for components that might not inherit from :root */
        body {
      `;

      // apply to body as well
      Object.entries(variables).forEach(([key, value]) => {
        cssContent += `      ${key}: ${value} !important;\n`;
      });

      cssContent += `
        }

        /* Ensure proper theme class is set */
        html, body {
          color-scheme: ${
            themeId.includes("light") ? "light" : "dark"
          } !important;
        }

        /* Ensure proper theme background and text colors */
        .theme-${themeId}, body.theme-${themeId}, #app, #app-container {
          background-color: ${variables["--theme-bg"]} !important;
          color: ${variables["--theme-base"]} !important;
        }

        /* Apply to specific application areas */
        .theme-${themeId} .connection-main,
        body.theme-${themeId} .connection-main {
          background-color: ${variables["--theme-bg"]} !important;
        }

        /* Navbar/header styling */
        .theme-${themeId} .connection-header,
        .theme-${themeId} header,
        .theme-${themeId} .titlebar,
        .theme-${themeId} .toolbar,
        .theme-${themeId} nav,
        .theme-${themeId} .app-header {
          background-color: ${variables["--theme-bg"]} !important;
          color: ${variables["--theme-base"]} !important;
        }

        /* Sidebar styling - these are explicit for maximum specificity */
        .theme-${themeId} .sidebar-wrapper,
        .theme-${themeId} .sidebar,
        .theme-${themeId} aside,
        body.theme-${themeId} .sidebar-wrapper,
        body.theme-${themeId} .sidebar,
        body.theme-${themeId} aside {
          background-color: ${variables["--sidebar-bg"]} !important;
          color: ${variables["--theme-base"]} !important;
        }

        /* Database connection panel styling */
        .theme-${themeId} .database-connection-panel,
        .theme-${themeId} .connection-selector,
        .theme-${themeId} .saved-connection-list {
          background-color: ${variables["--sidebar-bg"]} !important;
          color: ${variables["--theme-base"]} !important;
        }

        /* Make sure all popups and dialogs get theme colors */
        .theme-${themeId} .modal,
        .theme-${themeId} .dropdown-content,
        .theme-${themeId} .context-menu {
          background-color: ${variables["--theme-bg"]} !important;
          color: ${variables["--theme-base"]} !important;
        }
      `;

      // set the style element content
      styleElement.textContent = cssContent;

      console.log(`Applied theme variables with high priority for ${themeId}`);
    },
    // get color variables for a theme
    getColorsForTheme(themeId) {
      console.log("Getting colors for theme:", themeId);

      // CSS variables mapping - defaults that will be overridden
      let colors = {
        "--theme-active": themeId,
        "--theme-bg": "#252525",
        "--theme-base": "#ffffff",
        "--theme-string": "#a5d6ff",
        "--theme-keyword": "#ff7b72",
        "--theme-primary": "#ff7b72",
        "--theme-secondary": "#4ad0ff",
        "--border-color": "rgba(255, 255, 255, 0.1)",
        "--sidebar-bg": "#1e1e1e",
      };

      // find the theme in our list
      const theme = this.themes.find((t) => t.id === themeId);
      if (theme && theme.colors) {
        // convert theme colors to CSS variables
        const { background, foreground, string, keyword } = theme.colors;
        colors = {
          ...colors,
          "--theme-bg": background,
          "--theme-base": foreground,
          "--theme-string": string,
          "--theme-keyword": keyword,
          "--theme-primary": keyword,
          "--theme-secondary": string,
          "--border-color": `rgba(${this.colorToRgb(foreground)}, 0.1)`,
          "--sidebar-bg": this.lighten(background, 8),
        };
        console.log("Using colors from theme object:", colors);
        return colors;
      }

      // Standard built-in themes - must match ThemeInitializer.ts
      switch (themeId) {
        case "dark":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#252525",
            "--theme-base": "#ffffff",
            "--theme-string": "#a5d6ff",
            "--theme-keyword": "#ff7b72",
            "--theme-primary": "#ff7b72",
            "--theme-secondary": "#4ad0ff",
            "--border-color": "rgba(255, 255, 255, 0.1)",
            "--sidebar-bg": "#1e1e1e",
          };
        case "light":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#ffffff",
            "--theme-base": "#333333",
            "--theme-string": "#0000ff",
            "--theme-keyword": "#ff0000",
            "--theme-primary": "#ff0000",
            "--theme-secondary": "#0066cc",
            "--border-color": "rgba(0, 0, 0, 0.1)",
            "--sidebar-bg": "#f5f5f5",
          };
        case "solarized":
        case "solarized-light":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#fdf6e3",
            "--theme-base": "#657b83",
            "--theme-string": "#2aa198",
            "--theme-keyword": "#cb4b16",
            "--theme-primary": "#cb4b16",
            "--theme-secondary": "#b58900",
            "--border-color": "rgba(101, 123, 131, 0.1)",
            "--sidebar-bg": "#eee8d5",
          };
        case "solarized-dark":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#002b36",
            "--theme-base": "#839496",
            "--theme-string": "#2aa198",
            "--theme-keyword": "#cb4b16",
            "--theme-primary": "#cb4b16",
            "--theme-secondary": "#b58900",
            "--border-color": "rgba(147, 161, 161, 0.1)",
            "--sidebar-bg": "#073642",
          };
        case "github-dark":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#0d1117",
            "--theme-base": "#c9d1d9",
            "--theme-string": "#a5d6ff",
            "--theme-keyword": "#ff7b72",
            "--theme-primary": "#ff7b72",
            "--theme-secondary": "#79c0ff",
            "--border-color": "rgba(201, 209, 217, 0.1)",
            "--sidebar-bg": "#010409",
          };
        case "monokai":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#272822",
            "--theme-base": "#f8f8f2",
            "--theme-string": "#e6db74",
            "--theme-keyword": "#f92672",
            "--theme-primary": "#f92672",
            "--theme-secondary": "#66d9ef",
            "--border-color": "rgba(248, 248, 242, 0.1)",
            "--sidebar-bg": "#1e1f1c",
          };
        case "dracula":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#282a36",
            "--theme-base": "#f8f8f2",
            "--theme-string": "#f1fa8c",
            "--theme-keyword": "#ff79c6",
            "--theme-primary": "#ff79c6",
            "--theme-secondary": "#8be9fd",
            "--border-color": "rgba(248, 248, 242, 0.1)",
            "--sidebar-bg": "#21222c",
          };
        case "nord":
          return {
            "--theme-active": themeId,
            "--theme-bg": "#2e3440",
            "--theme-base": "#d8dee9",
            "--theme-string": "#a3be8c",
            "--theme-keyword": "#81a1c1",
            "--theme-primary": "#81a1c1",
            "--theme-secondary": "#88c0d0",
            "--border-color": "rgba(216, 222, 233, 0.1)",
            "--sidebar-bg": "#242933",
          };
      }

      // fallback to default values based on theme name pattern
      if (
        themeId.includes("dark") ||
        themeId.includes("black") ||
        themeId.includes("night")
      ) {
        // dark theme colors
        colors = {
          ...colors,
          "--theme-bg": "#1e1e1e",
          "--theme-base": "#ffffff",
          "--theme-string": "#a5d6ff",
          "--theme-keyword": "#ff7b72",
          "--theme-primary": "#ff7b72",
          "--theme-secondary": "#4ad0ff",
          "--border-color": "rgba(255, 255, 255, 0.1)",
          "--sidebar-bg": "#171717",
        };
        console.log("Using dark theme fallback colors for:", themeId);
      } else if (
        themeId.includes("light") ||
        themeId.includes("white") ||
        themeId.includes("day")
      ) {
        // light theme colors
        colors = {
          ...colors,
          "--theme-bg": "#ffffff",
          "--theme-base": "#333333",
          "--theme-string": "#0000ff",
          "--theme-keyword": "#ff0000",
          "--theme-primary": "#ff0000",
          "--theme-secondary": "#0066cc",
          "--border-color": "rgba(0, 0, 0, 0.1)",
          "--sidebar-bg": "#f5f5f5",
        };
        console.log("Using light theme fallback colors for:", themeId);
      } else {
        // neutral theme colors (fallback)
        colors = {
          ...colors,
          "--theme-bg": "#252525",
          "--theme-base": "#ffffff",
          "--theme-string": "#a5d6ff",
          "--theme-keyword": "#ff7b72",
          "--theme-primary": "#ff7b72",
          "--theme-secondary": "#4ad0ff",
          "--border-color": "rgba(255, 255, 255, 0.1)",
          "--sidebar-bg": "#1e1e1e",
        };
        console.log("Using neutral fallback colors for:", themeId);
      }

      return colors;
    },
    // utility: convert color to RGB
    colorToRgb(hex) {
      // handle empty or invalid hex
      if (!hex || typeof hex !== "string") return "255, 255, 255";

      // remove # if present
      hex = hex.replace("#", "");

      // handle shorthand hex (#RGB)
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }

      // parse the hex color
      try {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // return RGB values if valid
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
          return `${r}, ${g}, ${b}`;
        }
      } catch (e) {
        console.error("Error parsing color:", e);
      }

      // fallback to white
      return "255, 255, 255";
    },
    // utility: darken a color by a percentage
    darken(hex, percent) {
      // handle empty or invalid hex
      if (!hex || typeof hex !== "string") return "#1e1e1e";

      try {
        // remove # if present
        hex = hex.replace("#", "");

        // handle shorthand hex (#RGB)
        if (hex.length === 3) {
          hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
        }

        // parse the hex color
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // darken by reducing each component by the percentage
        r = Math.max(0, Math.floor((r * (100 - percent)) / 100));
        g = Math.max(0, Math.floor((g * (100 - percent)) / 100));
        b = Math.max(0, Math.floor((b * (100 - percent)) / 100));

        // convert back to hex
        return `#${r.toString(16).padStart(2, "0")}${g
          .toString(16)
          .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      } catch (e) {
        console.error("Error darkening color:", e);
        return "#1e1e1e"; // fallback to dark color
      }
    },
    async previewTheme(theme) {
      try {
        this.previewedThemeId = theme.id;

        localStorage.setItem("activeTheme", theme.id);

        this.$store.commit("settings/SET_THEME_PREVIEW", theme.id);

        const themeVariables = getThemeVariables(theme.id);
        Object.entries(themeVariables).forEach(([key, value]) => {
          document.documentElement.style.setProperty(key, value);
          document.body.style.setProperty(key, value);
        });

        document.body.className =
          document.body.className.replace(/theme-[a-zA-Z0-9-_]+/g, "").trim() +
          ` theme-${theme.id}`;

        document.documentElement.className =
          document.documentElement.className
            .replace(/theme-[a-zA-Z0-9-_]+/g, "")
            .trim() + ` theme-${theme.id}`;

        const connectionMain = document.querySelector(".connection-main");
        if (connectionMain) {
          const isDarkTheme = [
            "dark",
            "solarized-dark",
            "panda-syntax",
            "min-dark",
            "eva-dark",
          ].includes(theme.id);

          connectionMain.style.backgroundColor = themeVariables["--theme-bg"];

          const sidebar = document.querySelector(".sidebar-wrapper");
          if (sidebar) {
            sidebar.style.backgroundColor = themeVariables["--sidebar-bg"];
          }
        }

        await initializeTheme();

        this.$root.$emit("theme-preview-changed", {
          themeId: theme.id,
          css: null,
        });

        this.$noty.success(`Previewing theme: ${theme.name}`);
      } catch (error) {
        console.error("Error previewing theme:", error);
        this.error = `Could not preview theme: ${error.message}`;
      }
    },
    resetUploadState() {
      this.selectedFile = null;
      this.uploadError = null;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = "";
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    registerHandlers(handlers) {
      handlers.forEach(({ event, handler }) => {
        this.$root.$on(event, handler);
      });
    },
    unregisterHandlers(handlers) {
      handlers.forEach(({ event, handler }) => {
        this.$root.$off(event, handler);
      });
    },
    hexToRgb(hex) {
      hex = hex.replace(/^#/, "");

      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;

      return `${r}, ${g}, ${b}`;
    },
    adjustColor(color, amount) {
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
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.selectedFile = file;
      this.importing = true;
      this.uploadError = null;

      try {
        const result = await this.$util.send("themes/import", {
          filePath: file.path,
        });

        if (result.success) {
          this.$noty.success(
            `Theme "${result.theme.name}" imported successfully!`
          );
          await this.loadThemes();
        } else {
          this.uploadError = result.error || "Failed to import theme";
          this.$noty.error(this.uploadError);
        }
      } catch (error) {
        console.error("Error importing theme:", error);
        this.uploadError = "Failed to import theme. Please try again.";
        this.$noty.error(this.uploadError);
      } finally {
        this.importing = false;
        this.selectedFile = null;
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = "";
        }
      }
    },
    async importTheme() {
      if (!this.selectedFile) return;

      this.importing = true;
      this.uploadError = null;

      try {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const fileExtension = this.selectedFile.name
          .substring(this.selectedFile.name.lastIndexOf("."))
          .toLowerCase();
        const themeName = this.selectedFile.name.substring(
          0,
          this.selectedFile.name.lastIndexOf(".")
        );

        const newTheme = {
          id: themeName.toLowerCase().replace(/\s+/g, "-"),
          name: themeName,
          description: `Custom theme imported from ${this.selectedFile.name}`,
          colors: {
            background: "#252525",
            foreground: "#ffffff",
            string: "#a5d6ff",
            keyword: "#ff7b72",
          },
        };

        this.$store.dispatch("themes/addCustomTheme", newTheme);

        this.$noty.success(`Theme "${themeName}" imported successfully!`);
        this.resetUploadState();

        this.loadThemes();
      } catch (err) {
        console.error("Error importing theme:", err);
        this.uploadError =
          "Failed to import theme. Please check the file format and try again.";
      } finally {
        this.importing = false;
      }
    },
    // reload the current theme from localStorage or default
    reloadCurrentTheme() {
      try {
        // get stored theme or default to 'dark'
        const storedThemeId =
          localStorage.getItem("activeTheme") || this.themeValue || "dark";

        // get the theme object from our loaded themes
        const storedTheme = this.themes.find(
          (t) => String(t.id) === String(storedThemeId)
        );

        // if we found the theme, make it active
        if (storedTheme) {
          this.selectedTheme = storedTheme;
          this.activeTheme = storedThemeId;
          console.log("Restored theme from storage:", storedThemeId);
        } else {
          console.warn("Could not find stored theme:", storedThemeId);
        }
      } catch (err) {
        console.error("Error reloading current theme:", err);
      }
    },
    lighten(hex, percent) {
      // handle empty or invalid hex
      if (!hex || typeof hex !== "string") return "#1e1e1e";

      try {
        // remove # if present
        hex = hex.replace("#", "");

        // handle shorthand hex (#RGB)
        if (hex.length === 3) {
          hex = hex
            .split("")
            .map((c) => c + c)
            .join("");
        }

        // parse the hex color
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        // lighten by increasing each component by the percentage
        r = Math.min(255, Math.floor((r * (100 + percent)) / 100));
        g = Math.min(255, Math.floor((g * (100 + percent)) / 100));
        b = Math.min(255, Math.floor((b * (100 + percent)) / 100));

        // convert back to hex
        return `#${r.toString(16).padStart(2, "0")}${g
          .toString(16)
          .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      } catch (e) {
        console.error("Error lightening color:", e);
        return "#1e1e1e"; // fallback to dark color
      }
    },
  },
};
</script>

<style lang="scss">
/* completely reset theme cards to avoid style inheritance */
.theme-card {
  /* reset all inherited styles */
  all: initial;

  /* basic styling */
  display: block;
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  overflow: hidden;
  margin: 10px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    sans-serif;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  width: 280px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  }

  &.active::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 3px solid #4a90e2;
    border-radius: 6px;
    pointer-events: none;
  }
}

.theme-manager-modal {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;

  .theme-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .theme-info {
    padding: 15px;
    background-color: #f5f5f5;

    h4 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 500;
    }

    p {
      margin: 0 0 15px;
      font-size: 13px;
      opacity: 0.7;
    }
  }

  .button-group {
    display: flex;
    justify-content: center;

    button {
      padding: 8px 16px;
      background-color: #e74c3c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;

      &:hover {
        background-color: #c0392b;
      }

      &:disabled {
        background-color: #bdc3c7;
        cursor: not-allowed;
      }
    }
  }
}
</style>
