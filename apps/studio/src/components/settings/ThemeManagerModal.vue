<template>
  <div>
    <button
      v-if="$config && $config.isDevelopment"
      @click="show"
      class="debug-theme-manager-button"
    >
      Debug: Show Theme Manager
    </button>

    <div v-if="isVisible" class="theme-manager-modal">
      <div class="theme-manager-modal-overlay">
        <div class="theme-manager-modal-content">
          <div class="theme-manager-modal-header">
            <h3>Manage Custom Themes</h3>
            <button class="close-button" @click="close">×</button>
          </div>

          <div class="theme-manager-modal-body">
            <div class="tabs">
              <button
                :class="['tab-button', { active: activeTab === 'popular' }]"
                @click="activeTab = 'popular'"
              >
                Popular Themes
              </button>
              <button
                :class="['tab-button', { active: activeTab === 'upload' }]"
                @click="activeTab = 'upload'"
              >
                Upload Custom Theme
              </button>
            </div>

            <div v-if="activeTab === 'popular'" class="tab-content">
              <div v-if="loading" class="loading">Loading themes...</div>
              <div v-else-if="error" class="error">
                {{ error }}
              </div>
              <div v-else class="theme-grid">
                <div
                  v-for="theme in filteredThemes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{
                    active: theme.id === selectedTheme.id,
                    previewed:
                      theme.id === previewedThemeId &&
                      theme.id !== selectedTheme.id,
                  }"
                >
                  <div
                    class="theme-preview"
                    :style="{ backgroundColor: theme.colors.background }"
                  >
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.foreground }"
                    >
                      Text
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.string }"
                    >
                      String
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.keyword }"
                    >
                      Keyword
                    </div>
                  </div>
                  <div class="theme-info">
                    <h4>{{ theme.name }}</h4>
                    <p>{{ theme.description }}</p>
                    <div class="button-group">
                      <button class="btn-preview" @click="previewTheme(theme)">
                        Preview
                      </button>
                      <button
                        class="btn-apply"
                        @click="applyTheme(theme)"
                        :disabled="theme.isActive"
                      >
                        {{ theme.isActive ? "Current Theme" : "Apply Theme" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'all'" class="tab-content">
              <div v-if="loading" class="loading">Loading themes...</div>
              <div v-else-if="error" class="error">
                {{ error }}
              </div>
              <div v-else class="theme-grid">
                <div
                  v-for="theme in filteredThemes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{
                    active: theme.id === selectedTheme.id,
                    previewed:
                      theme.id === previewedThemeId &&
                      theme.id !== selectedTheme.id,
                  }"
                >
                  <div
                    class="theme-preview"
                    :style="{ backgroundColor: theme.colors.background }"
                  >
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.foreground }"
                    >
                      Text
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.string }"
                    >
                      String
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.keyword }"
                    >
                      Keyword
                    </div>
                  </div>
                  <div class="theme-info">
                    <h4>{{ theme.name }}</h4>
                    <p>{{ theme.description }}</p>
                    <div class="button-group">
                      <button class="btn-preview" @click="previewTheme(theme)">
                        Preview
                      </button>
                      <button
                        class="btn-apply"
                        @click="applyTheme(theme)"
                        :disabled="theme.isActive"
                      >
                        {{ theme.isActive ? "Current Theme" : "Apply Theme" }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="activeTab === 'custom'" class="tab-content">
              <div v-if="loading" class="loading">Loading themes...</div>
              <div v-else-if="error" class="error">
                {{ error }}
              </div>
              <div v-else class="theme-grid">
                <div
                  v-for="theme in filteredThemes"
                  :key="theme.id"
                  class="theme-card"
                  :class="{
                    active: theme.id === selectedTheme.id,
                    previewed:
                      theme.id === previewedThemeId &&
                      theme.id !== selectedTheme.id,
                  }"
                >
                  <div
                    class="theme-preview"
                    :style="{ backgroundColor: theme.colors.background }"
                  >
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.foreground }"
                    >
                      Text
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.string }"
                    >
                      String
                    </div>
                    <div
                      class="preview-item"
                      :style="{ color: theme.colors.keyword }"
                    >
                      Keyword
                    </div>
                  </div>
                  <div class="theme-info">
                    <h4>{{ theme.name }}</h4>
                    <p>{{ theme.description }}</p>
                    <div class="button-group">
                      <button class="btn-preview" @click="previewTheme(theme)">
                        Preview
                      </button>
                      <button
                        class="btn-apply"
                        @click="applyTheme(theme)"
                        :disabled="theme.isActive"
                      >
                        {{ theme.isActive ? "Current Theme" : "Apply Theme" }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="theme-card add-theme">
                  <div class="upload-area" @click="triggerFileInput">
                    <input
                      type="file"
                      ref="fileInput"
                      style="display: none"
                      accept=".css,.json"
                      @change="handleFileUpload"
                    />
                    <div class="upload-icon">+</div>
                    <div class="upload-text">Upload Theme</div>
                  </div>
                </div>

                <div v-if="activeTab === 'upload'" class="tab-content">
                  <div class="upload-section">
                    <h4>Upload a VSCode or SublimeText Theme</h4>
                    <p>
                      Supported formats: VSCode JSON (.json) or SublimeText XML
                      (.tmTheme)
                    </p>
                    <div class="file-upload">
                      <input
                        type="file"
                        ref="fileInput"
                        @change="handleFileUpload"
                        accept=".json,.tmTheme,.xml"
                        class="file-input"
                      />
                      <button class="btn-upload" @click="triggerFileUpload">
                        Select File
                      </button>
                      <span v-if="selectedFile">{{ selectedFile.name }}</span>
                    </div>

                    <div v-if="uploadError" class="error">
                      {{ uploadError }}
                    </div>

                    <button
                      v-if="selectedFile"
                      class="btn-import"
                      @click="importTheme"
                      :disabled="importing"
                    >
                      {{ importing ? "Importing..." : "Import Theme" }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="theme-manager-foot er">
                <button clas s="btn btn-flat" @click="close">Close</button>
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
import { defaultThemes } from "@/components/theme/ThemeConfigurations";
import { initializeTheme } from "@/components/theme/ThemeInitializer";
import { mapGetters, mapState } from "vuex";
import "./theme-manager-modal.scss";

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
  data() {
    return {
      isVisible: false,
      activeTab: "popular",
      loading: true,
      error: null,
      selectedTheme: null,
      allThemes: [],
      popularThemes: [],
      customThemes: [],
      selectedFile: null,
      uploadError: null,
      importing: false,
      previewedThemeId: null,
    };
  },
  computed: {
    ...mapState({
      currentTheme: (state) => state.settings.theme,
    }),
    ...mapGetters({
      themeValue: "settings/themeValue",
    }),
    filteredThemes() {
      if (this.activeTab === "popular") {
        return this.popularThemes;
      } else if (this.activeTab === "all") {
        return this.allThemes;
      } else if (this.activeTab === "custom") {
        return this.customThemes;
      }
      return this.allThemes;
    },
  },
  mounted() {
    this.loadThemes();
    this.registerHandlers([
      { event: AppEvent.showThemeManager, handler: this.show },
    ]);

    window.showThemeManagerModal = this.show;
  },
  beforeDestroy() {
    this.unregisterHandlers([
      { event: AppEvent.showThemeManager, handler: this.show },
    ]);

    if (window.showThemeManagerModal === this.show) {
      window.showThemeManagerModal = undefined;
    }
  },
  methods: {
    show() {
      this.isVisible = true;
    },
    close() {
      this.isVisible = false;
      this.resetUploadState();
      this.$emit("close");
    },
    async loadThemes() {
      this.loading = true;
      try {
        this.allThemes = [...defaultThemes];

        try {
          const fetchedThemes = await this.$store.dispatch(
            "themes/fetchThemes"
          );
          if (fetchedThemes && fetchedThemes.length) {
            const existingThemeIds = new Set(
              this.allThemes.map((theme) => theme.id)
            );
            const uniqueCustomThemes = fetchedThemes.filter(
              (theme) => !existingThemeIds.has(theme.id)
            );

            this.allThemes = [...this.allThemes, ...uniqueCustomThemes];
          }
        } catch (err) {
          console.warn("No custom themes found:", err);
        }

        const currentThemeId = this.themeValue || "dark";

        this.allThemes.forEach((theme) => {
          theme.isActive = theme.id === currentThemeId;
        });

        this.selectedTheme =
          this.allThemes.find((theme) => theme.id === currentThemeId) ||
          this.allThemes[0];

        this.popularThemes = this.allThemes.filter(
          (theme) => theme.isBuiltIn !== false
        );

        this.loading = false;
      } catch (err) {
        console.error("Error loading themes:", err);
        this.error = `Failed to load themes: ${err.message}`;
        this.loading = false;
      }
    },
    async applyTheme(theme) {
      try {
        this.selectedTheme = theme;
        this.previewedThemeId = theme.id;

        localStorage.setItem("activeTheme", theme.id);

        this.$store.commit("settings/SET_THEME", theme.id);

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

        if (this.styleTag) {
          document.head.removeChild(this.styleTag);
          this.styleTag = null;
        }

        this.close();

        this.$noty.success(`Theme "${theme.name}" applied successfully`);
      } catch (error) {
        console.error("Error applying theme:", error);
        this.error = `Could not apply theme: ${error.message}`;
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
  },
};
</script>

<style lang="scss" scoped>
@use "./theme-manager-modal.scss";
</style>
