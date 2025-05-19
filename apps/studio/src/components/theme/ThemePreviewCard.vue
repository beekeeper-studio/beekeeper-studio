<template>
  <div class="theme-card-wrapper" ref="wrapper">
    <!-- Content will be inserted into shadow DOM -->
  </div>
</template>

<script>
export default {
  name: "ThemePreviewCard",
  props: {
    theme: {
      type: Object,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },

  mounted() {
    try {
      const shadow = this.$refs.wrapper.attachShadow({ mode: "open" });

      // Get theme colors from the theme object
      const colors = this.getThemeColors();

      const style = document.createElement("style");
      style.textContent = `
        .theme-card {
          width: 280px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          overflow: hidden;
          margin: 10px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .theme-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
        
        ${this.isActive ? ".theme-card { box-shadow: 0 0 0 2px #4a90e2; }" : ""}
        
        .theme-preview {
          padding: 15px;
          height: 100px;
          background-color: ${colors.background};
        }
        
        .preview-item {
          margin-bottom: 8px;
          font-family: monospace;
          font-size: 14px;
        }
        
        .text { color: ${colors.foreground}; }
        .string { color: ${colors.string}; }
        .keyword { color: ${colors.keyword}; }
        
        .theme-info {
          padding: 15px;
          background-color: ${this.getLightOrDarkInfoBg(colors.background)};
          color: ${this.getLightOrDarkInfoText(colors.background)};
        }
        
        h4 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 500;
          color: ${this.getLightOrDarkInfoText(colors.background)};
        }
        
        p {
          margin: 0 0 15px;
          font-size: 13px;
          opacity: 0.7;
        }
        
        .btn {
          display: block;
          width: 100%;
          padding: 8px 16px;
          background-color: ${this.isActive ? "#4a90e2" : "#e74c3c"};
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          text-align: center;
          text-decoration: none;
        }
        
        .btn:hover {
          background-color: ${this.isActive ? "#3980d3" : "#c0392b"};
        }
        
        .btn:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }
      `;

      const card = document.createElement("div");
      card.className = "theme-card";

      const preview = document.createElement("div");
      preview.className = "theme-preview";

      const text = document.createElement("div");
      text.className = "preview-item text";
      text.textContent = "Text";

      const string = document.createElement("div");
      string.className = "preview-item string";
      string.textContent = "String";

      const keyword = document.createElement("div");
      keyword.className = "preview-item keyword";
      keyword.textContent = "Keyword";

      preview.appendChild(text);
      preview.appendChild(string);
      preview.appendChild(keyword);

      const info = document.createElement("div");
      info.className = "theme-info";

      const title = document.createElement("h4");
      title.textContent = this.theme.name;

      const desc = document.createElement("p");
      desc.textContent =
        this.theme.description ||
        (this.theme.custom ? "Custom theme" : "Built-in theme");

      const button = document.createElement("button");
      button.className = "btn";
      button.textContent = this.isActive ? "Current Theme" : "Select Theme";
      button.disabled = this.isActive;

      button.addEventListener("click", () => {
        if (!this.isActive) {
          this.$emit("select", this.theme);
        }
      });

      info.appendChild(title);
      info.appendChild(desc);
      info.appendChild(button);

      card.appendChild(preview);
      card.appendChild(info);

      shadow.appendChild(style);
      shadow.appendChild(card);
    } catch (error) {
      console.error("Error mounting ThemePreviewCard:", error);
    }
  },

  methods: {
    // Get theme colors with fallbacks for each theme
    getThemeColors() {
      // Start with default colors
      const defaultColors = {
        background: "#252525",
        foreground: "#ffffff",
        string: "#a5d6ff",
        keyword: "#ff7b72",
      };

      // Use colors from theme if available
      if (this.theme.colors) {
        return {
          ...defaultColors,
          ...this.theme.colors,
        };
      }

      // Special case handling for known themes
      const specialThemes = {
        dark: {
          background: "#252525",
          foreground: "#ffffff",
          string: "#a5d6ff",
          keyword: "#ff7b72",
        },
        light: {
          background: "#ffffff",
          foreground: "#333333",
          string: "#0000ff",
          keyword: "#ff0000",
        },
        dracula: {
          background: "#282a36",
          foreground: "#f8f8f2",
          string: "#f1fa8c",
          keyword: "#ff79c6",
        },
        monokai: {
          background: "#272822",
          foreground: "#f8f8f2",
          string: "#e6db74",
          keyword: "#f92672",
        },
        "ayu-mirage": {
          background: "#1f2430",
          foreground: "#cbccc6",
          string: "#bae67e",
          keyword: "#ffa759",
        },
        gruvbox: {
          background: "#282828",
          foreground: "#ebdbb2",
          string: "#b8bb26",
          keyword: "#fb4934",
        },
        "shades-of-purple": {
          background: "#2D2B55",
          foreground: "#A599E9",
          string: "#A5FF90",
          keyword: "#FF9D00",
        },
        "city-lights": {
          background: "#1d252c",
          foreground: "#b7c5d3",
          string: "#5ec4ff",
          keyword: "#ebbf83",
        },
        "panda-syntax": {
          background: "#292a2b",
          foreground: "#e6e6e6",
          string: "#19f9d8",
          keyword: "#ff75b5",
        },
      };

      // Check if we have a special case for this theme
      if (specialThemes[this.theme.id]) {
        return specialThemes[this.theme.id];
      }

      // Fallback to default colors
      return defaultColors;
    },

    // Calculate if the info section should have light or dark background
    getLightOrDarkInfoBg(bgColor) {
      return this.isLightColor(bgColor) ? "#f5f5f5" : "#333333";
    },

    // Calculate if the info text should be light or dark
    getLightOrDarkInfoText(bgColor) {
      return this.isLightColor(bgColor) ? "#333333" : "#f5f5f5";
    },

    // Determine if a color is light or dark
    isLightColor(hexColor) {
      // Remove # if present
      const hex = hexColor.replace("#", "");

      // Convert to RGB
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;

      // Calculate brightness (0-255) using perceived luminance
      // See: https://www.w3.org/TR/AERT/#color-contrast
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;

      // Anything > 125 is considered light
      return brightness > 125;
    },
  },
};
</script>
