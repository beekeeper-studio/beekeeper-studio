<template>
  <div class="theme-handler"></div>
</template>

<script>
export default {
  name: "ThemeHandler",

  mounted() {
    // Listen for theme changes from the backend
    window.electron.receive("theme-changed", this.handleThemeChange);
  },

  beforeDestroy() {
    // Clean up listener
    window.electron.removeListener("theme-changed", this.handleThemeChange);
  },

  methods: {
    handleThemeChange(themeData) {
      console.log("Received theme data:", themeData);
      this.applyThemeToDOM(themeData.name, themeData.fallbacks);
    },

    applyThemeToDOM(themeName, fallbacks) {
      // Set the theme class on the body
      document.body.className =
        document.body.className.replace(/theme-[a-zA-Z0-9-_]+/g, "").trim() +
        ` theme-${themeName}`;

      // This forces a CSS variable refresh
      document.body.style.setProperty("--theme-active", themeName);

      // Apply direct basic styles using computed values or fallbacks
      const computedStyle = getComputedStyle(document.documentElement);

      let bgColor = computedStyle.getPropertyValue("--theme-bg").trim();
      let textColor = computedStyle.getPropertyValue("--theme-base").trim();

      // Use fallbacks if CSS variables aren't available
      if (!bgColor && fallbacks) bgColor = fallbacks.bgColor;
      if (!textColor && fallbacks) textColor = fallbacks.textColor;

      console.log("Applying theme colors:", bgColor, textColor);

      // Apply colors to the body
      if (bgColor) document.body.style.background = bgColor;
      if (textColor) document.body.style.color = textColor;

      // Dispatch a custom event to notify the app that the theme has changed
      document.dispatchEvent(
        new CustomEvent("theme-changed", {
          detail: { theme: themeName },
        })
      );

      // Notify other components via Vue event bus
      this.$root.$emit("theme-applied", themeName);

      console.log("Theme class and styles set to:", themeName);
    },
  },
};
</script>
