import Vue from 'vue';
import App from './App.vue';
import './initialize/theme-manager-initializer';
import store from './store';

// Add type declaration for our global methods
declare global {
  interface Window {
    showThemeManager: () => boolean;
    openThemeManager: () => boolean;
    debugShowThemeManager: () => void;
  }
}

// Create and mount the Vue instance
const app = new Vue({
  store,
  render: h => h(App)
}).$mount('#app');

// Add the theme manager helper to the window object using Object assignment to avoid TypeScript errors
window.showThemeManager = function () {
  console.log('[main.ts] Global showThemeManager method called');

  // Try to trigger the theme manager modal through Vue events
  if (app && app.$root) {
    app.$root.$emit('show-theme-manager');
  }

  // Also dispatch a DOM event as a fallback
  try {
    window.dispatchEvent(new Event('show-theme-manager'));
    window.dispatchEvent(new Event('show-theme-manager-modal'));
  } catch (err) {
    console.error('[main.ts] Error dispatching DOM event', err);
  }

  return true;
};

// Log when events are received
window.addEventListener('show-theme-manager', () => {
  console.log('[main.ts] show-theme-manager DOM event received');
});

// Log when Vue events are emitted
app.$root.$on('show-theme-manager', () => {
  console.log('[main.ts] Vue root showThemeManager event received');
});

console.log('[main.ts] Vue app initialized and mounted');

// Expose a global function to show the theme manager modal
// This will be available as window.openThemeManager()
window.openThemeManager = function () {
  console.log("[MAIN] openThemeManager global function called");

  // 1. Set localStorage flags directly
  localStorage.setItem("pendingThemeManagerEvent", "true");
  localStorage.setItem("showThemeManagerImmediately", "true");

  // 2. Dispatch DOM events
  try {
    ["show-theme-manager", "show-theme-manager-modal", "theme-manager:show"].forEach(eventName => {
      window.dispatchEvent(new Event(eventName));
      console.log(`[MAIN] Dispatched ${eventName} event`);
    });
  } catch (err) {
    console.error("[MAIN] Error dispatching events:", err);
  }

  // 3. Try to access App component directly (Vue 2 approach)
  try {
    if (app && app.$children && app.$children.length > 0) {
      const appComponent = app.$children[0] as any;

      // Try to call showThemeManager on the App component
      if (typeof appComponent.showThemeManager === "function") {
        console.log("[MAIN] Calling App showThemeManager() directly");
        appComponent.showThemeManager();
        return true;
      }

      // Try to access the theme manager modal directly through $refs
      if (appComponent.$refs && appComponent.$refs.themeManagerModal) {
        const modal = appComponent.$refs.themeManagerModal as any;
        if (typeof modal.showModal === "function") {
          console.log("[MAIN] Calling ThemeManagerModal showModal() directly");
          modal.showModal();
          return true;
        }
      }
    }
  } catch (err) {
    console.error("[MAIN] Error accessing Vue components:", err);
  }

  console.log("[MAIN] Could not find direct methods, relying on events");
  return false;
};

// Add a debug method that does everything possible to show the modal
window.debugShowThemeManager = function () {
  console.log("🔍 [DEBUG] Trying all possible methods to show theme manager");

  // 1. Set all localStorage flags (safe approach)
  localStorage.setItem("pendingThemeManagerEvent", "true");
  localStorage.setItem("showThemeManagerImmediately", "true");
  localStorage.setItem("forceShowThemeManager", "true");

  // 2. Call both global methods (safe - defined by our code)
  if (typeof window.showThemeManager === "function") {
    window.showThemeManager();
  }

  if (typeof window.openThemeManager === "function") {
    window.openThemeManager();
  }

  // 3. Dispatch DOM events (safe approach)
  const events = ["show-theme-manager", "show-theme-manager-modal", "theme-manager:show"];
  events.forEach(eventName => {
    // Standard event
    window.dispatchEvent(new Event(eventName));

    // Custom event with data
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: { debug: true, timestamp: Date.now() }
    }));

    // Try to emit on Vue root
    if (app && app.$root) {
      app.$root.$emit(eventName);
    }
  });

  console.log("🔍 [DEBUG] All theme manager show attempts completed");
}; 
