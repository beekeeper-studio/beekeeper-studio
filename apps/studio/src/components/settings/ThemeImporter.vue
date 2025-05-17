<template>
  <div class="theme-importer">
    <h3>Custom Themes</h3>

    <div v-if="customThemes.length" class="theme-list">
      <div
        v-for="theme in customThemes"
        :key="theme.name"
        class="theme-item"
        :class="{ active: activeTheme === theme.name }"
        @click="activateTheme(theme.name)"
      >
        <div class="theme-name">
          {{ theme.name }}
        </div>
        <div class="theme-type">
          {{ theme.type }}
        </div>
        <div class="theme-actions">
          <button class="btn btn-fab" @click.stop="deleteTheme(theme.name)">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      No custom themes imported yet.
    </div>

    <div class="theme-actions">
      <button class="btn btn-flat" @click="importTheme">
        Import Theme...
      </button>
      <div class="hint">
        Supports VS Code (.json) and TextMate (.tmTheme) themes
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ThemeImporter',
  computed: {
    customThemes() {
      return this.$store.getters['settings/customThemes'];
    },
    activeTheme() {
      return this.$store.getters['settings/activeCustomTheme'];
    },
  },
  methods: {
    async importTheme() {
      try {
        const { filePaths } = await window.electron.dialog.showOpenDialog({
          properties: ['openFile'],
          filters: [
            {
              name: 'Theme Files',
              extensions: ['json', 'tmTheme', 'sublime-theme'],
            },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (filePaths && filePaths.length) {
          const themeName = await this.$store.dispatch(
            'settings/importTheme',
            filePaths[0]
          );
          await this.$store.dispatch('settings/activateTheme', themeName);

          this.$noty.success(`Theme "${themeName}" imported and activated.`);
        }
      } catch (error) {
        this.$noty.error(`Failed to import theme: ${error.message}`);
      }
    },
    async activateTheme(themeName) {
      try {
        await this.$store.dispatch('settings/activateTheme', themeName);
        this.$noty.success(`Theme "${themeName}" activated.`);
      } catch (error) {
        this.$noty.error(`Failed to activate theme: ${error.message}`);
      }
    },
    async deleteTheme(themeName) {
      try {
        if (
          confirm(`Are you sure you want to delete the theme "${themeName}"?`)
        ) {
          await this.$store.dispatch('settings/deleteTheme', themeName);
          this.$noty.success(`Theme "${themeName}" deleted.`);
        }
      } catch (error) {
        this.$noty.error(`Failed to delete theme: ${error.message}`);
      }
    },
  },
};
</script>

<style scoped>
.theme-importer {
  margin: 1rem 0;
}

.theme-list {
  margin: 1rem 0;
  border-radius: 6px;
  overflow: hidden;
}

.theme-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.theme-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.theme-item.active {
  background: rgba(255, 255, 255, 0.1);
}

.theme-name {
  flex: 1;
  font-weight: bold;
}

.theme-type {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-right: 1rem;
}

.theme-actions {
  margin-top: 1rem;
}

.empty-state {
  padding: 1rem;
  text-align: center;
  opacity: 0.7;
  font-style: italic;
}

.hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
