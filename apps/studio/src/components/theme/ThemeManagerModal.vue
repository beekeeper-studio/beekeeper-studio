<template>
  <div class="theme-manager-modal">
    <h2>Manage Custom Themes</h2>

    <div class="theme-grid">
      <div
        v-for="theme in themes"
        :key="theme.id"
        class="theme-card"
        :class="{ active: theme.id === activeTheme }"
      >
        <div
          class="theme-preview"
          :style="{ backgroundColor: theme.colors?.background || '#252525' }"
        >
          <div
            class="preview-item text"
            :style="{ color: theme.colors?.foreground || '#ffffff' }"
          >
            Text
          </div>
          <div
            class="preview-item string"
            :style="{ color: theme.colors?.string || '#a5d6ff' }"
          >
            String
          </div>
          <div
            class="preview-item keyword"
            :style="{ color: theme.colors?.keyword || '#ff7b72' }"
          >
            Keyword
          </div>
        </div>
        <div class="theme-info">
          <h4>{{ theme.name }}</h4>
          <p>
            {{
              theme.description ||
              (theme.type === "custom" ? "Custom theme" : "Built-in theme")
            }}
          </p>
          <div class="theme-actions">
            <button @click="previewTheme(theme.id)" class="btn btn-flat">
              Preview
            </button>
            <button @click="applyTheme(theme.id)" class="btn btn-primary">
              {{ theme.id === activeTheme ? "Current Theme" : "Apply Theme" }}
            </button>
            <button
              v-if="theme.type === 'custom'"
              @click="removeTheme(theme.id)"
              class="btn btn-danger"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div class="theme-card upload-card">
        <div class="upload-area" @click="$refs.fileInput.click()">
          <div class="upload-icon">+</div>
          <p>Upload Theme</p>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileUpload"
            accept=".json,.tmTheme,.xml"
            style="display: none"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ThemeManagerModal",
  data() {
    return {
      themes: [],
      loading: false,
      error: null,
      activeTheme: null,
      previewingTheme: null,
    };
  },
  async mounted() {
    await this.loadThemes();
    this.activeTheme = this.$store.getters["settings/themeValue"];
  },
  methods: {
    async loadThemes() {
      this.loading = true;
      try {
        // Load themes from Vuex store
        const builtInThemes = this.$store.getters["themes/allThemes"];
        console.log("Loaded themes from store:", builtInThemes);
        this.themes = builtInThemes;
        this.loading = false;
      } catch (err) {
        console.error("Error loading themes:", err);
        this.error = err.message;
        this.loading = false;
      }
    },
    async previewTheme(themeId) {
      try {
        console.log(`Previewing theme: ${themeId}`);
        this.previewingTheme = themeId;

        // Find the theme
        const theme = this.themes.find((t) => t.id === themeId);
        if (!theme) return;

        // Emit event for theme preview
        this.$root.$emit("theme-preview-changed", { themeId });

        this.$noty.success(`Previewing theme: ${theme.name}`);
      } catch (err) {
        console.error("Error previewing theme:", err);
        this.$noty.error(`Error previewing theme: ${err.message}`);
      }
    },
    async applyTheme(themeId) {
      try {
        console.log(`Applying theme: ${themeId}`);
        this.activeTheme = themeId;

        // Update Vuex store
        await this.$store.dispatch("settings/update", {
          key: "theme",
          value: themeId,
        });

        // Use the utility process to apply the theme
        const result = await this.$util.send("themes/apply", { name: themeId });

        if (!result.success) {
          throw new Error(result.error || "Failed to apply theme");
        }

        // Save the theme setting
        await this.$util.send("appdb/setting/save", {
          key: "theme",
          value: themeId,
        });

        const theme = this.themes.find((t) => t.id === themeId);
        this.$noty.success(`Theme ${theme.name} applied successfully`);
      } catch (err) {
        console.error("Error applying theme:", err);
        this.$noty.error(`Error applying theme: ${err.message}`);
      }
    },
    async removeTheme(themeId) {
      try {
        // Use the utility process to remove the theme
        const result = await this.$util.send("themes/remove", { themeId });

        if (!result.success) {
          throw new Error(result.error || "Failed to remove theme");
        }

        // Refresh theme list
        await this.loadThemes();
        this.$noty.success("Theme removed successfully");
      } catch (err) {
        this.$noty.error(`Error removing theme: ${err.message}`);
      }
    },
    handleFileUpload(event) {
      if (event.target.files.length) {
        this.processFiles(event.target.files);
      }
    },
    async processFiles(files) {
      for (const file of files) {
        try {
          // Get the file path
          const filePath = file.path;

          // Use the utility process to import the theme
          const result = await this.$util.send("themes/import", { filePath });

          if (!result.success) {
            throw new Error(result.error || "Failed to import theme");
          }

          // Refresh theme list
          await this.loadThemes();
          this.$noty.success(
            `Theme ${result.theme.name} imported successfully`
          );
        } catch (err) {
          this.$noty.error(`Error importing theme: ${err.message}`);
        }
      }
    },
  },
};
</script>

<style lang="scss">
.theme-manager-modal {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  color: var(--theme-base);

  h2 {
    margin-bottom: 20px;
    font-size: 1.5rem;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .theme-card {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.2s ease;
    position: relative;

    &.active {
      box-shadow: 0 0 0 2px var(--theme-primary, #0066ff);
    }

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }

    .theme-preview {
      padding: 15px;
      height: 100px;

      .preview-item {
        margin-bottom: 8px;
        font-family: monospace;
        font-size: 14px;
      }
    }

    .theme-info {
      padding: 15px;
      background-color: var(--theme-bg);

      h4 {
        margin: 0 0 8px;
        font-size: 16px;
      }

      p {
        margin: 0 0 15px;
        font-size: 13px;
        opacity: 0.7;
      }

      .theme-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;

        button {
          flex: 1;
          min-width: 80px;
          padding: 6px 10px;
          font-size: 12px;
        }
      }
    }
  }

  .upload-card {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.03);
    cursor: pointer;

    .upload-area {
      text-align: center;
      padding: 20px;

      .upload-icon {
        font-size: 32px;
        margin-bottom: 10px;
      }

      p {
        margin: 0;
      }
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
