/**
 * Theme Debugging Tool
 *
 * This script helps debug theme application in Beekeeper Studio
 * Run via:
 *   electron-rebuild -v $(electron -v) && npm run dev
 *   Then open Developer Tools and run this code in the Console
 */

const debugThemeSystem = () => {
  console.log("=== THEME DEBUGGING TOOL ===");

  // Check localStorage theme setting
  const localStorageTheme = localStorage.getItem("activeTheme");
  console.log("Theme from localStorage:", localStorageTheme);

  // Check if ThemeStoreModule is properly registered
  if (window.$store && window.$store.state.theme) {
    console.log("ThemeStore module is registered ✅");
    console.log(
      "ThemeManager visible:",
      window.$store.getters["theme/isThemeManagerVisible"]
    );
    console.log(
      "Available themes:",
      window.$store.getters["theme/allThemes"].length
    );
    console.log(
      "Custom themes:",
      window.$store.getters["theme/customThemes"].length
    );
  } else {
    console.error("ThemeStore module is NOT registered! ❌");
  }

  // Check theme CSS classes
  console.log("Body class:", document.body.className);
  console.log("HTML class:", document.documentElement.className);

  // Check key CSS variables
  const computedStyle = getComputedStyle(document.documentElement);
  const themeVars = {
    "--theme-active": computedStyle.getPropertyValue("--theme-active").trim(),
    "--theme-bg": computedStyle.getPropertyValue("--theme-bg").trim(),
    "--theme-base": computedStyle.getPropertyValue("--theme-base").trim(),
    "--theme-string": computedStyle.getPropertyValue("--theme-string").trim(),
    "--theme-keyword": computedStyle.getPropertyValue("--theme-keyword").trim(),
  };
  console.log("Theme CSS variables:", themeVars);

  // Test theme store actions
  console.log("Testing theme store actions...");
  if (window.$store && window.$store.dispatch) {
    try {
      // Toggle theme manager visibility
      window.$store.dispatch("theme/showThemeManager");
      console.log("Dispatched showThemeManager ✅");

      // Note: You can also test other theme actions here
      // window.$store.dispatch('theme/hideThemeManager');
    } catch (err) {
      console.error("Error dispatching theme actions:", err);
    }
  }

  // Find the theme manager modal element
  const themeManagerModal = document.querySelector("#theme-manager-container");
  if (themeManagerModal) {
    console.log("ThemeManagerModal is in the DOM ✅");
  } else {
    console.error("ThemeManagerModal is NOT in the DOM! ❌");
  }

  // Check if global functions exist
  if (typeof window.EMERGENCY_SHOW_THEME_MANAGER === "function") {
    console.log("EMERGENCY_SHOW_THEME_MANAGER function exists ✅");
  } else {
    console.error("EMERGENCY_SHOW_THEME_MANAGER function NOT found ❌");
  }

  if (typeof window.FORCE_SHOW_THEME_MANAGER === "function") {
    console.log("FORCE_SHOW_THEME_MANAGER function exists ✅");
  } else {
    console.error("FORCE_SHOW_THEME_MANAGER function NOT found ❌");
  }

  return "Theme debugging complete. Check console for results.";
};

// Run the debug function
debugThemeSystem();
