<template>
  <div class="theme-handler"></div>
</template>

<script>
export default {
  name: "ThemeHandler",

  mounted() {
    // Make sure window.electron exists before trying to use it
    if (!window.electron) {
      console.warn("[ThemeHandler] window.electron is not available");
      return;
    }

    // Safely attempt to register listeners
    try {
      // Listen for theme changes from the backend, only if receive is available
      if (typeof window.electron.receive === "function") {
        window.electron.receive("theme-changed", this.handleThemeChange);
      } else {
        console.warn("[ThemeHandler] window.electron.receive is not available");
      }

      // Also listen for theme:changed events (with colon format)
      if (window.electron.ipcRenderer) {
        window.electron.ipcRenderer.on("theme:changed", (_event, themeData) => {
          console.log(
            "[ThemeHandler] Received theme:changed event with data:",
            themeData
          );
          this.handleThemeChange(themeData);
        });

        // Handle localStorage updates via IPC instead of executeJavaScript
        window.electron.ipcRenderer.on(
          "theme:update-local",
          (_event, themeId) => {
            console.log(
              "[ThemeHandler] Received theme:update-local event with themeId:",
              themeId
            );
            if (themeId) {
              // Update localStorage
              const previousTheme = localStorage.getItem("activeTheme");
              localStorage.setItem("activeTheme", themeId);
              console.log(
                `[ThemeHandler] Updated localStorage theme from ${previousTheme} to ${themeId}`
              );

              // Apply theme classes directly for immediate feedback
              document.body.className =
                document.body.className
                  .replace(/theme-[a-zA-Z0-9-_]+/g, "")
                  .trim() + ` theme-${themeId}`;
              document.documentElement.className =
                document.documentElement.className
                  .replace(/theme-[a-zA-Z0-9-_]+/g, "")
                  .trim() + ` theme-${themeId}`;

              // Force a CSS variable refresh
              document.body.style.setProperty("--theme-active", themeId);

              // Try to update the store if available
              if (this.$store && this.$store.dispatch) {
                this.$store
                  .dispatch("settings/save", {
                    key: "theme",
                    value: themeId,
                  })
                  .catch((err) =>
                    console.error(
                      "[ThemeHandler] Error updating theme in store:",
                      err
                    )
                  );
              }
            }
          }
        );

        // Handle theme request from main process
        window.electron.ipcRenderer.on(
          "get-theme-request",
          (_event, responseChannel) => {
            console.log(
              "[ThemeHandler] Received get-theme-request, responding on channel:",
              responseChannel
            );
            const activeTheme = localStorage.getItem("activeTheme");
            // Send the response back on the provided response channel
            window.electron.ipcRenderer.send(responseChannel, activeTheme);
          }
        );
      } else {
        console.warn(
          "[ThemeHandler] window.electron.ipcRenderer is not available"
        );
      }
    } catch (error) {
      console.error("[ThemeHandler] Error setting up event listeners:", error);
    }
  },

  beforeDestroy() {
    // Only attempt to remove listeners if electron is available
    if (!window.electron) {
      return;
    }

    try {
      // Clean up listeners if receive method exists
      if (typeof window.electron.removeListener === "function") {
        window.electron.removeListener("theme-changed", this.handleThemeChange);
      }

      // Remove the theme:changed listener if ipcRenderer exists
      if (window.electron.ipcRenderer) {
        window.electron.ipcRenderer.removeAllListeners("theme:changed");
        window.electron.ipcRenderer.removeAllListeners("theme:update-local");
        window.electron.ipcRenderer.removeAllListeners("get-theme-request");
      }
    } catch (error) {
      console.error("[ThemeHandler] Error cleaning up event listeners:", error);
    }
  },

  methods: {
    handleThemeChange(themeData) {
      console.log("[ThemeHandler] Received theme data:", themeData);

      // Extract the theme ID - this is what we need for applying the theme
      const themeId =
        themeData.id || themeData.name?.toLowerCase().replace(/\s+/g, "-");

      if (!themeId) {
        console.error(
          "[ThemeHandler] Invalid theme data received, no ID or name available",
          themeData
        );
        return;
      }

      console.log("[ThemeHandler] Applying theme with ID:", themeId);

      // Store in localStorage for persistence
      localStorage.setItem("activeTheme", themeId);

      // Set the theme class on the body (immediate visual feedback)
      this.applyThemeToDOM(themeId, themeData.fallbacks);

      // Ensure we save this theme to the settings store for persistence
      this.syncThemeWithStore(themeId);
    },

    syncThemeWithStore(themeId) {
      // Try to update the store if available
      if (this.$store && this.$store.dispatch) {
        console.log("[ThemeHandler] Saving theme to store:", themeId);
        this.$store
          .dispatch("settings/save", {
            key: "theme",
            value: themeId,
          })
          .then(() => {
            console.log(
              "[ThemeHandler] Successfully saved theme to store:",
              themeId
            );
          })
          .catch((err) => {
            console.error("[ThemeHandler] Error updating theme in store:", err);
          });
      } else {
        console.warn(
          "[ThemeHandler] Store not available for theme persistence"
        );
      }
    },

    applyThemeToDOM(themeId, fallbacks) {
      try {
        // Remove existing theme classes
        document.body.className = document.body.className
          .replace(/theme-[a-zA-Z0-9-_]+/g, "")
          .trim();
        document.documentElement.className = document.documentElement.className
          .replace(/theme-[a-zA-Z0-9-_]+/g, "")
          .trim();

        // Apply new theme class
        document.body.classList.add(`theme-${themeId}`);
        document.documentElement.classList.add(`theme-${themeId}`);

        // Set CSS variable for active theme
        document.body.style.setProperty("--theme-active", themeId);
        document.documentElement.style.setProperty("--theme-active", themeId);

        // If we have fallbacks like baseTheme, add those classes too
        if (fallbacks && fallbacks.baseTheme) {
          document.body.classList.add(`base-theme-${fallbacks.baseTheme}`);
          document.documentElement.classList.add(
            `base-theme-${fallbacks.baseTheme}`
          );
        }

        // Trigger a window resize event to force UI components to redraw
        window.dispatchEvent(new Event("resize"));

        return true;
      } catch (error) {
        console.error("[ThemeHandler] Error applying theme to DOM:", error);
        return false;
      }
    },
  },
};
</script>
