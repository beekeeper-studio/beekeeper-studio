<template>
  <div class="theme-manager-modal">
    <h2>Theme Manager</h2>

    <div class="theme-list">
      <div v-for="theme in themes" :key="theme.id" class="theme-item">
        <div class="theme-name">{{ theme.name }}</div>
        <div class="theme-controls">
          <button @click="applyTheme(theme.id)" class="btn btn-primary">
            Apply
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

    <div class="theme-upload">
      <h3>Import Theme</h3>
      <div
        class="dropzone"
        @dragover.prevent="onDragOver"
        @drop.prevent="onDrop"
      >
        <p>Drop theme files here or</p>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileUpload"
          accept=".json,.tmTheme,.xml"
        />
        <button @click="$refs.fileInput.click()" class="btn btn-secondary">
          Browse
        </button>
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
    };
  },
  async mounted() {
    await this.loadThemes();
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
    async applyTheme(name) {
      try {
        console.log(`Applying theme: ${name}`);

        // Update Vuex store
        await this.$store.dispatch("settings/update", {
          key: "theme",
          value: name,
        });

        // Use the utility process to apply the theme
        const result = await this.$util.send("themes/apply", { name });

        if (!result.success) {
          throw new Error(result.error || "Failed to apply theme");
        }

        // Save the theme setting
        await this.$util.send("appdb/setting/save", {
          key: "theme",
          value: name,
        });

        this.$toasted.show(`Theme ${name} applied successfully`);
      } catch (err) {
        console.error("Error applying theme:", err);
        this.$toasted.error(`Error applying theme: ${err.message}`);
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
        this.$toasted.show("Theme removed successfully");
      } catch (err) {
        this.$toasted.error(`Error removing theme: ${err.message}`);
      }
    },
    onDragOver(event) {
      event.dataTransfer.dropEffect = "copy";
    },
    onDrop(event) {
      if (event.dataTransfer.files.length) {
        this.processFiles(event.dataTransfer.files);
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
          this.$toasted.show(
            `Theme ${result.theme.name} imported successfully`
          );
        } catch (err) {
          this.$toasted.error(`Error importing theme: ${err.message}`);
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.theme-manager-modal {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;

  h2 {
    margin-bottom: 20px;
  }

  .theme-list {
    margin-bottom: 30px;
    max-height: 400px;
    overflow-y: auto;

    .theme-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      margin-bottom: 5px;
      border: 1px solid var(--border-color, #ddd);
      border-radius: 4px;

      &:last-child {
        margin-bottom: 0;
      }

      .theme-name {
        font-weight: 500;
      }

      .theme-controls {
        button {
          margin-left: 10px;
        }
      }
    }
  }

  .theme-upload {
    background-color: var(--background-color, #f5f5f5);
    padding: 20px;
    border-radius: 8px;

    h3 {
      margin-bottom: 15px;
    }

    .dropzone {
      border: 2px dashed var(--border-color, #ddd);
      border-radius: 4px;
      padding: 30px;
      text-align: center;
      transition: background-color 0.3s;

      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }

      input[type="file"] {
        display: none;
      }

      p {
        margin-bottom: 15px;
      }
    }
  }
}
</style>
