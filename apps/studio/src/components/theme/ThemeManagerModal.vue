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
        // Load themes from server or local storage
        this.themes = []; // Replace with actual theme loading
        this.loading = false;
      } catch (err) {
        this.error = err.message;
        this.loading = false;
      }
    },
    async applyTheme(name) {
      try {
        // Use the utility process to apply the theme
        const result = await this.$util.send("themes/apply", { name });

        if (!result.success) {
          throw new Error(result.error || "Failed to apply theme");
        }

        this.$toasted.show(`Theme ${name} applied successfully`);
      } catch (err) {
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

    .theme-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      border-bottom: 1px solid var(--border-color);

      &:last-child {
        border-bottom: none;
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
    background-color: var(--background-color);
    padding: 20px;
    border-radius: 8px;

    h3 {
      margin-bottom: 15px;
    }

    .dropzone {
      border: 2px dashed var(--border-color);
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
