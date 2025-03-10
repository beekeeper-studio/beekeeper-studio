<template>
  <div>
    <!-- Debug button for development only -->
    <button v-if="$config && $config.isDevelopment" 
            @click="show"
            class="debug-theme-manager-button"
    >
      Debug: Show Theme Manager
    </button>
    
    <!-- Modal implementation -->
    <div v-if="isVisible" class="theme-manager-modal-overlay">
      <div class="theme-manager-modal-content">
        <div class="theme-manager-header">
          <h3>Manage Custom Themes</h3>
          <button class="close-button" @click="close">
            ×
          </button>
        </div>
        
        <div class="theme-manager-body">
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
          
          <!-- Popular Themes Tab -->
          <div v-if="activeTab === 'popular'" class="tab-content">
            <div v-if="loading" class="loading">
              Loading themes...
            </div>
            <div v-else-if="error" class="error">
              {{ error }}
            </div>
            <div v-else class="theme-grid">
              <div v-for="theme in popularThemes" :key="theme.id" 
                   :class="['theme-card', { 'active': theme.isActive }]"
              >
                <div class="theme-preview" :style="{ backgroundColor: theme.colors.background }">
                  <div class="preview-item" :style="{ color: theme.colors.foreground }">
                    Text
                  </div>
                  <div class="preview-item" :style="{ color: theme.colors.string }">
                    String
                  </div>
                  <div class="preview-item" :style="{ color: theme.colors.keyword }">
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
                    <button class="btn-apply" 
                            @click="applyTheme(theme)"
                            :disabled="theme.isActive"
                    >
                      {{ theme.isActive ? 'Current Theme' : 'Apply Theme' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Upload Custom Theme Tab -->
          <div v-if="activeTab === 'upload'" class="tab-content">
            <div class="upload-section">
              <h4>Upload a VSCode or SublimeText Theme</h4>
              <p>Supported formats: VSCode JSON (.json) or SublimeText XML (.tmTheme)</p>
              
              <div class="file-upload">
                <input 
                  type="file" 
                  ref="fileInput" 
                  @change="handleFileUpload" 
                  accept=".json,.tmTheme,.xml"
                  class="file-input"
                >
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
                {{ importing ? 'Importing...' : 'Import Theme' }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="theme-manager-footer">
          <button class="btn btn-flat" @click="close">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { AppEvent } from '@/common/AppEvent';
import { mapGetters, mapState } from 'vuex';

export default {
  name: 'ThemeManagerModal',
  data() {
    return {
      isVisible: false,
      activeTab: 'popular',
      loading: false,
      error: null,
      popularThemes: [],
      selectedFile: null,
      uploadError: null,
      importing: false
    }
  },
  computed: {
    ...mapState({
      currentTheme: state => state.settings.theme
    }),
    ...mapGetters({
      themeValue: 'settings/themeValue',
      allThemes: 'themes/allThemes'
    })
  },
  mounted() {
    console.log('ThemeManagerModal mounted');
    
    // Listen for Vue event (for the debug button)
    this.$root.$on('show-theme-manager', this.show);
    
    // Try to access electron via window
    if (window.electron && window.electron.ipcRenderer) {
      console.log('Setting up IPC listener via window.electron');
      window.electron.ipcRenderer.on(AppEvent.showThemeManager, this.show);
    } else {
      // Fallback to window event listener
      console.log('Setting up window event listener');
      window.addEventListener(AppEvent.showThemeManager, this.show);
    }
    
    // Set up a global method that can be called from the main process
    window.showThemeManagerModal = this.show;
  },
  beforeDestroy() {
    console.log('ThemeManagerModal being destroyed');
    this.$root.$off('show-theme-manager', this.show);
    
    // Clean up IPC listener
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.removeListener(AppEvent.showThemeManager, this.show);
    }
    
    // Remove window event listener
    window.removeEventListener(AppEvent.showThemeManager, this.show);
    
    // Clean up global method
    window.showThemeManagerModal = undefined;
  },
  methods: {
    show() {
      console.log('Showing theme manager modal');
      this.isVisible = true;
      this.fetchPopularThemes();
    },
    close() {
      console.log('Closing theme manager modal');
      this.isVisible = false;
      this.resetUploadState();
    },
    async fetchPopularThemes() {
      this.loading = true;
      this.error = null;
      
      try {
        console.log('Fetching themes, current theme value:', this.themeValue);
        
        // Get themes from the store
        const themes = this.allThemes || [];
        
        // Mark the current theme as active
        this.popularThemes = themes.map(theme => ({
          ...theme,
          isActive: theme.id === this.themeValue
        }));
        
        console.log('Themes loaded:', this.popularThemes.length);
        console.log('Active theme:', this.popularThemes.find(t => t.isActive)?.name || 'None');
      } catch (err) {
        console.error('Error fetching themes:', err);
        this.error = 'Failed to load themes. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    applyTheme(theme) {
      console.log('Applying theme:', theme.name, theme.id);
      
      if (theme.isActive) {
        console.log('Theme is already active');
        return;
      }
      
      try {
        // Save theme to user settings
        this.$store.dispatch('settings/save', { key: 'theme', value: theme.id });
        
        // Update UI to reflect the change
        document.body.className = `theme-${theme.id}`;
        
        // Apply the theme CSS via IPC if available
        if (window.electron && window.electron.ipcRenderer) {
          console.log(`Requesting theme CSS application for ${theme.id}`);
          window.electron.ipcRenderer.invoke('themes/apply', { name: theme.id })
            .then(result => {
              if (result.success) {
                console.log(`Theme ${theme.id} applied successfully via IPC`);
              } else {
                console.error(`Failed to apply theme ${theme.id}:`, result.error);
                // Fallback: Try to load the theme CSS from a file
                this.loadThemeCssFile(theme.id);
              }
            })
            .catch(err => {
              console.error(`Error applying theme ${theme.id}:`, err);
              // Fallback: Try to load the theme CSS from a file
              this.loadThemeCssFile(theme.id);
            });
        } else {
          // Fallback: Try to load the theme CSS from a file
          this.loadThemeCssFile(theme.id);
        }
        
        // Update the active theme in our local state
        this.popularThemes = this.popularThemes.map(t => ({
          ...t,
          isActive: t.id === theme.id
        }));
        
        // Notify user
        this.$noty.success(`Theme "${theme.name}" applied successfully!`);
        
        // Notify other windows about the theme change
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send(AppEvent.settingsChanged);
        }
        
        // Close the modal after applying
        this.close();
      } catch (error) {
        console.error('Error applying theme:', error);
        this.$noty.error(`Failed to apply theme: ${error.message}`);
      }
    },
    loadThemeCssFile(themeId) {
      console.log(`Attempting to load CSS file for theme: ${themeId}`);
      
      // Try to load the theme CSS from a file
      const linkId = `theme-css-${themeId}`;
      
      // Remove any existing theme link
      const existingLink = document.getElementById(linkId);
      if (existingLink) {
        existingLink.remove();
      }
      
      // Create a new link element
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `./assets/styles/themes/${themeId}/theme.css`;
      
      // Add error handling
      link.onerror = () => {
        console.error(`Failed to load CSS file for theme: ${themeId}`);
      };
      
      link.onload = () => {
        console.log(`Successfully loaded CSS file for theme: ${themeId}`);
      };
      
      // Add the link to the document head
      document.head.appendChild(link);
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.uploadError = null;
      
      // Validate file type
      const validExtensions = ['.json', '.tmtheme', '.xml'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        this.uploadError = 'Invalid file type. Please upload a VSCode JSON or SublimeText XML theme file.';
        return;
      }
      
      this.selectedFile = file;
    },
    async importTheme() {
      if (!this.selectedFile) return;
      
      this.importing = true;
      this.uploadError = null;
      
      try {
        // In a real implementation, this would parse and import the theme
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing
        
        const fileExtension = this.selectedFile.name.substring(this.selectedFile.name.lastIndexOf('.')).toLowerCase();
        const themeName = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.'));
        
        // Create a new theme object
        const newTheme = {
          id: themeName.toLowerCase().replace(/\s+/g, '-'),
          name: themeName,
          description: `Custom theme imported from ${this.selectedFile.name}`,
          colors: {
            background: '#252525',
            foreground: '#ffffff',
            string: '#a5d6ff',
            keyword: '#ff7b72'
          }
        };
        
        // Add the theme to the store
        this.$store.dispatch('themes/addCustomTheme', newTheme);
        
        console.log(`Imported ${fileExtension === '.json' ? 'VSCode' : 'SublimeText'} theme: ${themeName}`);
        
        this.$noty.success(`Theme "${themeName}" imported successfully!`);
        this.resetUploadState();
        
        // Refresh the theme list
        this.fetchPopularThemes();
      } catch (err) {
        console.error('Error importing theme:', err);
        this.uploadError = 'Failed to import theme. Please check the file format and try again.';
      } finally {
        this.importing = false;
      }
    },
    resetUploadState() {
      this.selectedFile = null;
      this.uploadError = null;
      if (this.$refs.fileInput) {
        this.$refs.fileInput.value = '';
      }
    },
    previewTheme(theme) {
      console.log('Previewing theme:', theme.name, theme.id);
      
      try {
        // Update UI to reflect the change
        document.body.className = `theme-${theme.id}`;
        
        // Apply the theme CSS via IPC if available
        if (window.electron && window.electron.ipcRenderer) {
          console.log(`Requesting theme CSS application for preview: ${theme.id}`);
          window.electron.ipcRenderer.invoke('themes/apply', { name: theme.id })
            .then(result => {
              if (result.success) {
                console.log(`Theme ${theme.id} preview applied successfully via IPC`);
              } else {
                console.error(`Failed to apply theme preview ${theme.id}:`, result.error);
                // Fallback: Try to load the theme CSS from a file
                this.loadThemeCssFile(theme.id);
              }
            })
            .catch(err => {
              console.error(`Error applying theme preview ${theme.id}:`, err);
              // Fallback: Try to load the theme CSS from a file
              this.loadThemeCssFile(theme.id);
            });
        } else {
          // Fallback: Try to load the theme CSS from a file
          this.loadThemeCssFile(theme.id);
        }
        
        // Notify user
        this.$noty.info(`Previewing theme "${theme.name}". Click "Apply Theme" to keep it.`);
      } catch (error) {
        console.error('Error previewing theme:', error);
        this.$noty.error(`Failed to preview theme: ${error.message}`);
      }
    }
  }
}
</script>

<style>
.debug-theme-manager-button {
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

.theme-manager-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.theme-manager-modal-content {
  background-color: var(--theme-bg, #252525);
  border-radius: 8px;
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}

.theme-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.theme-manager-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--theme-base, #fff);
  opacity: 0.7;
}

.close-button:hover {
  opacity: 1;
}

.theme-manager-body {
  padding: 20px;
  overflow-y: auto;
  flex-grow: 1;
}

.theme-manager-footer {
  padding: 15px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-button {
  background: none;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  color: var(--theme-base, #fff);
  opacity: 0.7;
  font-size: 14px;
  position: relative;
}

.tab-button.active {
  opacity: 1;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--theme-primary, #4caf50);
}

.tab-content {
  min-height: 300px;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  color: var(--theme-base, #fff);
}

.error {
  color: var(--theme-error, #f44336);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.theme-card {
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s;
}

.theme-card:hover {
  transform: translateY(-5px);
}

.theme-preview {
  height: 120px;
  padding: 15px;
}

.preview-item {
  margin-bottom: 8px;
  font-family: monospace;
}

.theme-info {
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.2);
}

.theme-info h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
}

.theme-info p {
  margin: 0 0 15px 0;
  font-size: 12px;
  opacity: 0.8;
}

.button-group {
  display: flex;
  gap: 8px;
}

.btn-preview {
  background-color: var(--theme-secondary, #2196f3);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  flex: 1;
}

.btn-apply {
  background-color: var(--theme-primary, #4caf50);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  flex: 1;
}

.upload-section {
  max-width: 500px;
  margin: 0 auto;
}

.file-upload {
  display: flex;
  align-items: center;
  margin: 20px 0;
}

.file-input {
  display: none;
}

.btn-upload {
  background-color: var(--theme-secondary, #2196f3);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.btn-import {
  background-color: var(--theme-primary, #4caf50);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-import:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-flat {
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--theme-base, #fff);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.theme-card.active {
  border: 2px solid var(--theme-primary, #4caf50);
  box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--theme-secondary, #999);
}
</style>
