<template>
  <div class="theme-manager-container">
    <!-- Debug button for testing - can be removed in production -->
    <button v-if="$store.state.isDevelopment" @click="showModal" class="debug-button">
      Debug: Show Theme Manager
    </button>
    
    <div class="theme-manager-modal" v-if="isVisible">
      <div class="modal-backdrop" @click="closeModal" />
      <div class="modal-content">
        <div class="modal-header">
          <h3>Manage Custom Themes</h3>
          <button class="close-button" @click="closeModal">
            ×
          </button>
        </div>
        <div class="modal-body">
          <div v-if="customThemes.length === 0" class="no-themes">
            <p>No custom themes available. Import a theme to get started.</p>
          </div>
          <div v-else class="theme-list">
            <div v-for="theme in customThemes" :key="theme.id" class="theme-item">
              <div class="theme-info">
                <h4>{{ theme.name }}</h4>
                <p>{{ theme.description || 'No description available' }}</p>
              </div>
              <div class="theme-actions">
                <button @click="activateTheme(theme)" class="btn btn-primary">
                  Activate
                </button>
                <button @click="deleteTheme(theme)" class="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="importTheme" class="btn btn-primary">
            Import Theme
          </button>
          <button @click="closeModal" class="btn">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import { AppEvent } from '../common/AppEvent'

export default {
  name: 'ThemeManagerModal',
  data() {
    return {
      isVisible: false,
      customThemes: []
    }
  },
  mounted() {
    // Listen for the show-theme-manager event from the main process
    ipcRenderer.on(AppEvent.showThemeManager, () => {
      console.log('Received showThemeManager event')
      this.showModal()
    })

    // For debugging - listen to a Vue event bus event as well
    this.$root.$on('show-theme-manager', () => {
      console.log('Received show-theme-manager Vue event')
      this.showModal()
    })

    // Load custom themes when component is mounted
    this.loadCustomThemes()
  },
  beforeDestroy() {
    // Clean up event listeners
    ipcRenderer.removeAllListeners(AppEvent.showThemeManager)
    this.$root.$off('show-theme-manager')
  },
  methods: {
    showModal() {
      console.log('Showing theme manager modal')
      this.isVisible = true
      // Refresh the list of themes when showing the modal
      this.loadCustomThemes()
    },
    closeModal() {
      this.isVisible = false
    },
    loadCustomThemes() {
      // This would typically load themes from storage
      // For now, we'll use a placeholder
      this.customThemes = [
        // Example themes - replace with actual implementation
        // { id: 1, name: 'Dark+', description: 'Enhanced dark theme' }
      ]
    },
    importTheme() {
      // Implement theme import functionality
      console.log('Import theme clicked')
      // This would open a file dialog to select a theme file
    },
    activateTheme(theme) {
      // Implement theme activation
      console.log('Activating theme:', theme.name)
    },
    deleteTheme(theme) {
      // Implement theme deletion
      console.log('Deleting theme:', theme.name)
      this.customThemes = this.customThemes.filter(t => t.id !== theme.id)
    }
  }
}
</script>

<style scoped>
.debug-button {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 9999;
  background-color: #ff5722;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.theme-manager-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 80%;
  max-width: 600px;
  background-color: var(--theme-bg);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
  z-index: 1001;
}

.modal-header {
  padding: 15px;
  border-bottom: 1px solid var(--theme-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-footer {
  padding: 15px;
  border-top: 1px solid var(--theme-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--theme-text);
}

.theme-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--theme-border);
  border-radius: 4px;
}

.theme-actions {
  display: flex;
  gap: 5px;
}

.no-themes {
  text-align: center;
  padding: 20px;
}

.btn {
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--theme-border);
  background-color: var(--theme-bg-light);
  color: var(--theme-text);
}

.btn-primary {
  background-color: var(--theme-primary);
  color: white;
  border-color: var(--theme-primary-dark);
}

.btn-danger {
  background-color: var(--theme-danger);
  color: white;
  border-color: var(--theme-danger-dark);
}
</style> 
