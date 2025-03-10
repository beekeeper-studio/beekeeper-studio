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
              <div v-for="theme in popularThemes" :key="theme.id" class="theme-card">
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
                  <button class="btn-apply" @click="applyTheme(theme)">
                    Apply Theme
                  </button>
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
        // Example data - in a real implementation, this would be fetched from an API
        // For now, we'll use mock data to demonstrate the UI
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        this.popularThemes = [
          {
            id: 'github-dark',
            name: 'GitHub Dark',
            description: 'GitHub dark theme for Beekeeper Studio',
            colors: {
              background: '#0d1117',
              foreground: '#c9d1d9',
              string: '#a5d6ff',
              keyword: '#ff7b72'
            }
          },
          {
            id: 'monokai',
            name: 'Monokai',
            description: 'Monokai theme for Beekeeper Studio',
            colors: {
              background: '#272822',
              foreground: '#f8f8f2',
              string: '#e6db74',
              keyword: '#f92672'
            }
          },
          {
            id: 'dracula',
            name: 'Dracula',
            description: 'Dracula theme for Beekeeper Studio',
            colors: {
              background: '#282a36',
              foreground: '#f8f8f2',
              string: '#f1fa8c',
              keyword: '#ff79c6'
            }
          },
          {
            id: 'nord',
            name: 'Nord',
            description: 'Nord theme for Beekeeper Studio',
            colors: {
              background: '#2e3440',
              foreground: '#d8dee9',
              string: '#a3be8c',
              keyword: '#81a1c1'
            }
          },
          {
            id: 'solarized-dark',
            name: 'Solarized Dark',
            description: 'Solarized Dark theme for Beekeeper Studio',
            colors: {
              background: '#002b36',
              foreground: '#839496',
              string: '#2aa198',
              keyword: '#cb4b16'
            }
          },
          {
            id: 'solarized-light',
            name: 'Solarized Light',
            description: 'Solarized Light theme for Beekeeper Studio',
            colors: {
              background: '#fdf6e3',
              foreground: '#657b83',
              string: '#2aa198',
              keyword: '#cb4b16'
            }
          }
        ];
      } catch (err) {
        console.error('Error fetching themes:', err);
        this.error = 'Failed to load themes. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    applyTheme(theme) {
      // In a real implementation, this would apply the theme to the application
      console.log('Applying theme:', theme.name);
      // Example implementation:
      // this.$store.dispatch('settings/setTheme', theme.id);
      this.$noty.success(`Theme "${theme.name}" applied successfully!`);
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
        
        console.log(`Imported ${fileExtension === '.json' ? 'VSCode' : 'SublimeText'} theme: ${themeName}`);
        
        this.$noty.success(`Theme "${themeName}" imported successfully!`);
        this.resetUploadState();
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

.btn-apply {
  background-color: var(--theme-primary, #4caf50);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  width: 100%;
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
</style>
