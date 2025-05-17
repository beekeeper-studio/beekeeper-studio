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

                <!-- Add theme upload button -->
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
import { baseThemes } from "@/components/theme/ThemeConfigurations";
import { mapGetters, mapState } from "vuex";
import "./theme-manager-modal.scss";

export default {
  name: "ThemeManagerModal",
  data() {
    return {
      isVisible: false,
      activeTab: "popular",
      loading: true,
      error: null,
      selectedTheme: null,
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
      allThemes: "themes/allThemes",
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
    this.loadThemes().then(() => {
      this.selectedTheme =
        this.allThemes.find((theme) => theme.id === this.themeValue) ||
        this.allThemes[0];
    });

    this.registerHandlers([
      { event: AppEvent.showThemeManager, handler: this.show },
    ]);
  },
  beforeDestroy() {
    this.unregisterHandlers([
      { event: AppEvent.showThemeManager, handler: this.show },
    ]);
  },
  methods: {
    show() {
      this.isVisible = true;
      this.fetchPopularThemes();
    },
    close() {
      this.isVisible = false;
      this.resetUploadState();
      this.$emit("close");
    },
    async fetchPopularThemes() {
      this.loading = true;
      this.error = null;

      try {
        const themes = this.allThemes || [];

        this.popularThemes = themes.map((theme) => ({
          ...theme,
          isActive: theme.id === this.themeValue,
        }));
      } catch (err) {
        console.error("Error fetching themes:", err);
        this.error = "Failed to load themes. Please try again.";
      } finally {
        this.loading = false;
      }
    },
    async applyTheme(theme) {
      try {
        const result = await this.$util.send("themes/apply", {
          name: theme.id,
        });

        if (result.success) {
          this.$store.dispatch("settings/save", {
            key: "theme",
            value: theme.id,
          });

          this.selectedTheme = theme;
          this.previewedThemeId = null;

          this.allThemes.forEach((t) => {
            t.isActive = t.id === theme.id;
          });

          this.$noty.success(`Theme "${theme.name}" applied successfully`);
          this.$emit("close");
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error applying theme:", error);
        this.$noty.error(`Failed to apply theme: ${error.message}`);
      }
    },
    async previewTheme(theme) {
      try {
        const result = await this.$util.send("themes/getCSS", {
          name: theme.id,
        });

        if (result.success) {
          this.previewedThemeId = theme.id;
          this.$root.$emit("theme-preview-changed", {
            themeId: theme.id,
            css: result.css,
            baseTheme: baseThemes.includes(theme.id) ? undefined : "dark",
          });
          this.$noty.success(`Previewing theme: ${theme.name}`);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error previewing theme:", error);
        this.$noty.error(`Failed to preview theme: ${error.message}`);
      }
    },
    async loadThemes() {
      this.loading = true;
      this.error = null;

      try {
        await this.$store.dispatch("themes/fetchThemes");
        const currentThemeId = this.themeValue;
        this.selectedTheme =
          this.allThemes.find((theme) => theme.id === currentThemeId) ||
          this.allThemes[0];
        this.popularThemes = this.allThemes.filter(
          (theme) => theme.isBuiltIn && theme.isPopular
        );
        this.customThemes = this.allThemes.filter((theme) => !theme.isBuiltIn);

        this.allThemes.forEach((theme) => {
          theme.isActive = theme.id === currentThemeId;
        });
      } catch (error) {
        console.error("Error loading themes:", error);
        this.error = "Failed to load themes. Please try again.";
      } finally {
        this.loading = false;
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
      // Remove the hash if it exists
      hex = hex.replace(/^#/, "");

      // Parse the hex values
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;

      // Return the RGB values as a string
      return `${r}, ${g}, ${b}`;
    },
    // Removed applyFallbackThemeStyles - now handled by ThemeService
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

        console.log(
          `Imported ${
            fileExtension === ".json" ? "VSCode" : "SublimeText"
          } theme: ${themeName}`
        );

        this.$noty.success(`Theme "${themeName}" imported successfully!`);
        this.resetUploadState();

        this.fetchPopularThemes();
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
