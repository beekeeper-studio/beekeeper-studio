import Vue from 'vue';
import App from './App.vue';
import './initialize/theme-manager-initializer';
import store from './store';

declare global {
  interface Window {
    showThemeManager: () => boolean;
    openThemeManager: () => boolean;
  }
}

const app = new Vue({
  store,
  render: h => h(App)
}).$mount('#app');

window.showThemeManager = function () {
  console.log('[main.ts] Global showThemeManager method called');

  if (app && app.$root) {
    app.$root.$emit('show-theme-manager');
  }

  try {
    window.dispatchEvent(new Event('show-theme-manager'));
    window.dispatchEvent(new Event('show-theme-manager-modal'));
  } catch (err) {
    console.error('[main.ts] Error dispatching DOM event', err);
  }

  return true;
};

window.addEventListener('show-theme-manager', () => {
  console.log('[main.ts] show-theme-manager DOM event received');
});

app.$root.$on('show-theme-manager', () => {
  console.log('[main.ts] Vue root showThemeManager event received');
});

console.log('[main.ts] Vue app initialized and mounted');

window.openThemeManager = function () {
  console.log("[MAIN] openThemeManager global function called");

  localStorage.setItem("pendingThemeManagerEvent", "true");
  localStorage.setItem("showThemeManagerImmediately", "true");

  try {
    ["show-theme-manager", "show-theme-manager-modal", "theme-manager:show"].forEach(eventName => {
      window.dispatchEvent(new Event(eventName));
      console.log(`[MAIN] Dispatched ${eventName} event`);
    });
  } catch (err) {
    console.error("[MAIN] Error dispatching events:", err);
  }

  try {
    if (app && app.$children && app.$children.length > 0) {
      const appComponent = app.$children[0] as any;

      if (typeof appComponent.showThemeManager === "function") {
        console.log("[MAIN] Calling App showThemeManager() directly");
        appComponent.showThemeManager();
        return true;
      }

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
