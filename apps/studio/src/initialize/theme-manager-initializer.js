console.log("[ThemeManagerInitializer] Starting initialization");

// Method to initialize DOM event listeners
function initializeThemeManagerEventListeners() {
  console.log("[ThemeManagerInitializer] Setting up DOM event listeners");

  // Set up DOM event listeners for theme manager actions
  const eventNames = [
    "show-theme-manager",
    "show-theme-manager-modal",
    "theme-manager:show",
    "theme-manager-action",
  ];

  eventNames.forEach((eventName) => {
    console.log(`[ThemeManagerInitializer] Adding listener for ${eventName}`);
    window.addEventListener(eventName, function (event) {
      console.log(
        `[ThemeManagerInitializer] Received ${eventName} event`,
        event
      );

      // Try multiple approaches
      if (window.__vue_app__?.themeManager?.showModal) {
        console.log(
          "[ThemeManagerInitializer] Showing via window.__vue_app__.themeManager"
        );
        window.__vue_app__.themeManager.showModal();
        return;
      }

      if (window.showThemeManagerModal) {
        console.log("[ThemeManagerInitializer] Showing via global function");
        window.showThemeManagerModal();
        return;
      }

      // Store in localStorage as fallback
      console.log("[ThemeManagerInitializer] Using localStorage fallback");
      localStorage.setItem("pendingThemeManagerEvent", "true");
      localStorage.setItem("showThemeManagerImmediately", "true");
    });
  });
}

// Method to check for pending theme manager events
function checkPendingThemeManagerEvents() {
  if (localStorage.getItem("pendingThemeManagerEvent") === "true") {
    console.log("[ThemeManagerInitializer] Found pending theme manager event");

    // Try to show the modal
    if (window.__vue_app__?.themeManager?.showModal) {
      console.log(
        "[ThemeManagerInitializer] Showing via window.__vue_app__.themeManager"
      );
      window.__vue_app__.themeManager.showModal();
      return;
    }

    if (window.showThemeManagerModal) {
      console.log("[ThemeManagerInitializer] Showing via global function");
      window.showThemeManagerModal();
    }
  }
}

// Check if we're in the renderer process
if (typeof window !== "undefined") {
  // Initialize right away for DOM events
  initializeThemeManagerEventListeners();

  // Check for events when DOM is ready
  document.addEventListener("DOMContentLoaded", function () {
    console.log("[ThemeManagerInitializer] DOM content loaded");

    // Wait a bit for app to initialize before checking for pending events
    setTimeout(checkPendingThemeManagerEvents, 1000);

    // Set up interval to check periodically
    setInterval(checkPendingThemeManagerEvents, 5000);
  });

  // Export for direct imports
  if (typeof exports !== "undefined") {
    exports.checkPendingThemeManagerEvents = checkPendingThemeManagerEvents;
    exports.initializeThemeManagerEventListeners =
      initializeThemeManagerEventListeners;
  }
}

console.log("[ThemeManagerInitializer] Initialization complete");
