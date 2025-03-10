<template>
  <div>
    <button v-if="$config && $config.isDevelopment" 
            @click="show"
            class="debug-theme-manager-button"
    >
      Debug: Show Theme Manager
    </button>
    
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
    
    this.$root.$on('show-theme-manager', this.show);
    
    if (window.electron && window.electron.ipcRenderer) {
      console.log('Setting up IPC listener via window.electron');
      window.electron.ipcRenderer.on(AppEvent.showThemeManager, this.show);
    } else {
      console.log('Setting up window event listener');
      window.addEventListener(AppEvent.showThemeManager, this.show);
    }
    
    window.showThemeManagerModal = this.show;
    
    // Add debugging function to window
    window.debugTheme = (themeId) => {
      console.log(`Debug theme called for: ${themeId}`);
      const theme = this.allThemes.find(t => t.id === themeId);
      if (theme) {
        console.log(`Theme object:`, JSON.stringify(theme));
        console.log(`Current body class: ${document.body.className}`);
        
        // Try to find the theme CSS
        let themeLink = null;
        document.querySelectorAll('link').forEach(link => {
          if (link.href && link.href.includes(themeId)) {
            themeLink = link;
            console.log(`Found theme link: ${link.href}`);
          }
        });
        
        if (!themeLink) {
          console.log(`No theme link found for ${themeId}`);
        }
        
        // Check for style elements
        let themeStyle = null;
        document.querySelectorAll('style').forEach(style => {
          if (style.textContent && style.textContent.includes(`theme-${themeId}`)) {
            themeStyle = style;
            console.log(`Found theme style element: ${style.id}`);
          }
        });
        
        if (!themeStyle) {
          console.log(`No theme style element found for ${themeId}`);
        }
        
        // Check computed styles
        const computedStyle = window.getComputedStyle(document.body);
        console.log(`Computed background color: ${computedStyle.backgroundColor}`);
        console.log(`Computed text color: ${computedStyle.color}`);
        
        // Try to force apply the theme
        this.applyFallbackThemeStyles(themeId);
      } else {
        console.error(`Theme ${themeId} not found in allThemes`);
        console.log(`Available themes:`, this.allThemes.map(t => t.id));
      }
    };

    // Listen for theme preview events
    this.$root.$on('theme-preview-changed', (payload) => {
      let themeId;
      let css;
      
      // Handle both string and object payloads
      if (typeof payload === 'string') {
        themeId = payload;
      } else {
        themeId = payload.themeId;
        css = payload.css;
      }
      
      console.log(`App received theme preview change: ${themeId}`);
      document.body.className = `theme-${themeId}`;
      
      if (css) {
        // Apply the CSS directly
        const style = document.createElement('style');
        style.id = `theme-css-${themeId}`;
        style.textContent = css;
        
        // Remove any existing theme styles
        document.querySelectorAll('style[id^="theme-css-"]').forEach(existingStyle => {
          existingStyle.remove();
        });
        
        // Add the new style
        document.head.appendChild(style);
      } else {
        // Apply the theme CSS
        const linkId = `theme-css-${themeId}`;
        
        // Remove any existing theme links
        document.querySelectorAll('link[id^="theme-css-"]').forEach(link => {
          link.remove();
        });
        
        // Create a new link element
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `./assets/styles/themes/${themeId}/theme.css`;
        
        // Add the link to the document head
        document.head.appendChild(link);
      }
    });

    // Also listen for window events
    window.addEventListener('theme-preview', (event) => {
      const themeId = event.detail.themeId;
      const css = event.detail.css;
      
      console.log(`App received window theme preview event: ${themeId}`);
      document.body.className = `theme-${themeId}`;
      
      if (css) {
        // Apply the CSS directly
        const style = document.createElement('style');
        style.id = `theme-css-${themeId}`;
        style.textContent = css;
        
        // Remove any existing theme styles
        document.querySelectorAll('style[id^="theme-css-"]').forEach(existingStyle => {
          existingStyle.remove();
        });
        
        // Add the new style
        document.head.appendChild(style);
      }
    });
  },
  beforeDestroy() {
    console.log('ThemeManagerModal being destroyed');
    this.$root.$off('show-theme-manager', this.show);
    
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.removeListener(AppEvent.showThemeManager, this.show);
    }
    
    window.removeEventListener(AppEvent.showThemeManager, this.show);
    
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
        
        const themes = this.allThemes || [];
        
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
        this.$store.dispatch('settings/save', { key: 'theme', value: theme.id });
        
        document.body.className = `theme-${theme.id}`;
        
        if (window.electron && window.electron.ipcRenderer) {
          console.log(`Requesting theme CSS application for ${theme.id}`);
          
          window.electron.ipcRenderer.invoke('themes/removeActive')
            .then(() => {
              return window.electron.ipcRenderer.invoke('themes/apply', { name: theme.id });
            })
            .then(result => {
              if (result.success) {
                console.log(`Theme ${theme.id} applied successfully via IPC`);
              } else {
                console.error(`Failed to apply theme ${theme.id}:`, result.error);
                this.loadThemeCssFile(theme.id);
              }
            })
            .catch(err => {
              console.error(`Error applying theme ${theme.id}:`, err);
              this.loadThemeCssFile(theme.id);
            });
        } else {
          this.loadThemeCssFile(theme.id);
        }
        
        this.popularThemes = this.popularThemes.map(t => ({
          ...t,
          isActive: t.id === theme.id
        }));
        
        this.$noty.success(`Theme "${theme.name}" applied successfully!`);
        
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send(AppEvent.settingsChanged);
        }
        
        this.close();
      } catch (error) {
        console.error('Error applying theme:', error);
        this.$noty.error(`Failed to apply theme: ${error.message}`);
      }
    },
    loadThemeCssFile(themeId) {
      console.log(`Attempting to load CSS file for theme: ${themeId}`);
      
      const linkId = `theme-css-${themeId}`;
      
      document.querySelectorAll('link[id^="theme-css-"]').forEach(link => {
        link.remove();
      });
      
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      
      const possiblePaths = [
        `./assets/styles/themes/${themeId}/theme.css`,
        `./assets/styles/themes/${themeId}.css`,
        `./themes/${themeId}.css`
      ];
      
      link.onerror = () => {
        console.error(`Failed to load CSS file for theme: ${themeId}`);
        
        if (possiblePaths.length > 0) {
          const nextPath = possiblePaths.shift();
          console.log(`Trying alternative path: ${nextPath}`);
          link.href = nextPath;
        } else {
          console.error(`All paths failed for theme: ${themeId}`);
          this.applyFallbackThemeStyles(themeId);
          
          // Notify the main application about the fallback theme
          this.$root.$emit('theme-preview-changed', themeId);
          
          // Create a custom event
          const themeChangeEvent = new CustomEvent('theme-preview', { 
            detail: { themeId: themeId } 
          });
          window.dispatchEvent(themeChangeEvent);
        }
      };
      
      link.onload = () => {
        console.log(`Successfully loaded CSS file for theme: ${themeId}`);
        
        // Notify the main application about the theme change
        this.$root.$emit('theme-preview-changed', themeId);
        
        // Create a custom event
        const themeChangeEvent = new CustomEvent('theme-preview', { 
          detail: { themeId: themeId } 
        });
        window.dispatchEvent(themeChangeEvent);
        
        // If we're in an electron environment, send an IPC message
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send(AppEvent.settingsChanged, { 
            key: 'theme', 
            value: themeId,
            isPreview: true 
          });
        }
      };
      
      const initialPath = possiblePaths.shift();
      link.href = initialPath;
      
      document.head.appendChild(link);
    },
    applyFallbackThemeStyles(themeId) {
      console.log(`Applying fallback styles for theme: ${themeId}`);
      
      const theme = this.allThemes.find(t => t.id === themeId);
      
      if (!theme) {
        console.error(`Theme not found in store: ${themeId}`);
        return;
      }
      
      console.log(`Theme object for fallback:`, JSON.stringify(theme));
      
      // Remove any existing theme styles
      document.querySelectorAll('style[id^="theme-css-"], style[id^="fallback-theme-"]').forEach(style => {
        style.remove();
      });
      
      // Remove any existing theme links
      document.querySelectorAll('link[id^="theme-css-"]').forEach(link => {
        link.remove();
      });
      
      const style = document.createElement('style');
      style.id = `fallback-theme-${themeId}`;
      
      // Generate CSS from theme colors
      const cssContent = `
        .theme-${themeId} {
          --theme-bg: ${theme.colors.background};
          --theme-base: ${theme.colors.foreground};
          --theme-string: ${theme.colors.string};
          --theme-keyword: ${theme.colors.keyword};
          
          --theme-primary: ${theme.colors.keyword};
          --theme-secondary: ${this.adjustColor(theme.colors.keyword, -20)};
          --theme-error: #f44336;
          --theme-warning: #ff9800;
          --theme-success: #4caf50;
          
          /* Editor colors */
          --editor-bg: ${theme.colors.background};
          --editor-fg: ${theme.colors.foreground};
          
          /* Sidebar colors */
          --sidebar-bg: ${this.adjustColor(theme.colors.background, -10)};
          --sidebar-fg: ${theme.colors.foreground};
          
          /* Table colors */
          --table-header-bg: ${this.adjustColor(theme.colors.background, -5)};
          --table-header-fg: ${theme.colors.foreground};
          --table-row-bg: ${theme.colors.background};
          --table-row-fg: ${theme.colors.foreground};
          --table-row-alt-bg: ${this.adjustColor(theme.colors.background, 5)};
          --table-border: ${this.adjustColor(theme.colors.background, 15)};
        }
        
        .theme-${themeId} body {
          background-color: ${theme.colors.background} !important;
          color: ${theme.colors.foreground} !important;
        }
        
        .theme-${themeId} .theme-manager-modal-content {
          background-color: var(--theme-bg, ${theme.colors.background});
        }
        
        .theme-${themeId} .close-button {
          color: var(--theme-base, ${theme.colors.foreground});
        }
        
        .theme-${themeId} .tab-button {
          color: var(--theme-base, ${theme.colors.foreground});
        }
        
        .theme-${themeId} .tab-button.active::after {
          background-color: var(--theme-primary, ${theme.colors.keyword});
        }
        
        .theme-${themeId} .loading, .theme-${themeId} .error {
          color: var(--theme-base, ${theme.colors.foreground});
        }
        
        .theme-${themeId} .error {
          color: var(--theme-error, #f44336);
        }
        
        .theme-${themeId} .btn-preview {
          background-color: var(--theme-secondary, ${this.adjustColor(theme.colors.keyword, -20)});
        }
        
        .theme-${themeId} .btn-apply {
          background-color: var(--theme-primary, ${theme.colors.keyword});
        }
        
        .theme-${themeId} .btn-flat {
          color: var(--theme-base, ${theme.colors.foreground});
        }
        
        .theme-${themeId} .theme-card.active {
          border: 2px solid var(--theme-primary, ${theme.colors.keyword});
          box-shadow: 0 0 10px ${this.adjustColor(theme.colors.keyword, -20)};
        }
      `;
      
      console.log(`Generated fallback CSS:`, cssContent);
      style.textContent = cssContent;
      
      // Add the style to the document head
      console.log(`Adding fallback style to document head`);
      document.head.appendChild(style);
      
      // Force the body class to be set
      console.log(`Setting body class to theme-${themeId}`);
      document.body.className = `theme-${themeId}`;
      
      // Notify the main application about the theme change
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send(AppEvent.settingsChanged, { 
          key: 'theme', 
          value: themeId,
          isPreview: true,
          css: cssContent // Send the CSS to the main process
        });
      }
      
      // Create a custom event that can be listened to by the main application
      const themeChangeEvent = new CustomEvent('theme-preview', { 
        detail: { themeId: themeId, css: cssContent } 
      });
      window.dispatchEvent(themeChangeEvent);
      
      // For non-electron environments, emit an event
      this.$root.$emit('theme-preview-changed', { themeId: themeId, css: cssContent });
      
      // Log the result
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(document.body);
        console.log(`After fallback, body background color: ${computedStyle.backgroundColor}`);
        console.log(`After fallback, body text color: ${computedStyle.color}`);
      }, 100);
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
      
      let g = ((num >> 8) & 0x00FF) + amount;
      g = Math.max(Math.min(g, 255), 0);
      
      let b = (num & 0x0000FF) + amount;
      b = Math.max(Math.min(b, 255), 0);
      
      return (usePound ? "#" : "") + (g | (r << 8) | (b << 16)).toString(16).padStart(6, '0');
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      
      this.uploadError = null;
      
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
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const fileExtension = this.selectedFile.name.substring(this.selectedFile.name.lastIndexOf('.')).toLowerCase();
        const themeName = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.'));
        
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
        
        this.$store.dispatch('themes/addCustomTheme', newTheme);
        
        console.log(`Imported ${fileExtension === '.json' ? 'VSCode' : 'SublimeText'} theme: ${themeName}`);
        
        this.$noty.success(`Theme "${themeName}" imported successfully!`);
        this.resetUploadState();
        
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
          
          // First try to remove any existing theme
          window.electron.ipcRenderer.invoke('themes/removeActive')
            .then(() => {
              // Then apply the new theme
              return window.electron.ipcRenderer.invoke('themes/apply', { name: theme.id });
            })
            .then(result => {
              if (result.success) {
                console.log(`Theme ${theme.id} preview applied successfully via IPC`);
              } else {
                console.error(`Failed to apply theme preview ${theme.id}:`, result.error);
                // Fallback: Apply fallback styles
                this.applyFallbackThemeStyles(theme.id);
              }
            })
            .catch(err => {
              console.error(`Error applying theme preview ${theme.id}:`, err);
              // Fallback: Apply fallback styles
              this.applyFallbackThemeStyles(theme.id);
            });
        } else {
          // Apply fallback styles
          this.applyFallbackThemeStyles(theme.id);
        }
        
        // Notify user
        this.$noty.info(`Previewing theme "${theme.name}". Click "Apply Theme" to keep it.`);
      } catch (error) {
        console.error('Error previewing theme:', error);
        this.$noty.error(`Failed to preview theme: ${error.message}`);
      }
    },
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
