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
              <div 
                v-for="theme in filteredThemes" 
                :key="theme.id" 
                class="theme-card" 
                :class="{ 
                  'active': theme.id === selectedTheme.id,
                  'previewed': theme.id === previewedThemeId && theme.id !== selectedTheme.id
                }"
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
          
          <div v-if="activeTab === 'all'" class="tab-content">
            <div v-if="loading" class="loading">
              Loading themes...
            </div>
            <div v-else-if="error" class="error">
              {{ error }}
            </div>
            <div v-else class="theme-grid">
              <div 
                v-for="theme in filteredThemes" 
                :key="theme.id" 
                class="theme-card" 
                :class="{ 
                  'active': theme.id === selectedTheme.id,
                  'previewed': theme.id === previewedThemeId && theme.id !== selectedTheme.id
                }"
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
          
          <div v-if="activeTab === 'custom'" class="tab-content">
            <div v-if="loading" class="loading">
              Loading themes...
            </div>
            <div v-else-if="error" class="error">
              {{ error }}
            </div>
            <div v-else class="theme-grid">
              <div 
                v-for="theme in filteredThemes" 
                :key="theme.id" 
                class="theme-card" 
                :class="{ 
                  'active': theme.id === selectedTheme.id,
                  'previewed': theme.id === previewedThemeId && theme.id !== selectedTheme.id
                }"
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
              
              <!-- Add theme upload button -->
              <div class="theme-card add-theme">
                <div class="upload-area" @click="triggerFileInput">
                  <input 
                    type="file" 
                    ref="fileInput" 
                    style="display: none" 
                    accept=".css,.json" 
                    @change="handleFileUpload"
                  >
                  <div class="upload-icon">
                    +
                  </div>
                  <div class="upload-text">
                    Upload Theme
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
      loading: true,
      error: null,
      selectedTheme: null,
      popularThemes: [],
      customThemes: [],
      selectedFile: null,
      uploadError: null,
      importing: false,
      previewedThemeId: null
    }
  },
  computed: {
    ...mapState({
      currentTheme: state => state.settings.theme
    }),
    ...mapGetters({
      themeValue: 'settings/themeValue',
      allThemes: 'themes/allThemes'
    }),
    filteredThemes() {
      if (this.activeTab === 'popular') {
        return this.popularThemes;
      } else if (this.activeTab === 'all') {
        return this.allThemes;
      } else if (this.activeTab === 'custom') {
        return this.customThemes;
      }
      return this.allThemes;
    },
  },
  mounted() {
    // Load themes when the component is mounted
    this.loadThemes().then(() => {
      // Set the selected theme to the current theme
      this.selectedTheme = this.allThemes.find(theme => theme.id === this.themeValue) || this.allThemes[0];
      
      // Apply the current theme
      if (this.selectedTheme) {
        this.loadThemeCssFile(this.selectedTheme.id);
      }
    });
    
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
      let baseTheme;
      
      // Handle both string and object payloads
      if (typeof payload === 'string') {
        themeId = payload;
      } else {
        themeId = payload.themeId;
        css = payload.css;
        baseTheme = payload.baseTheme;
      }
      
      console.log(`ThemeManagerModal received theme preview change: ${themeId}`);
      
      // Handle built-in themes differently from custom themes
      const builtInThemes = ['dark', 'light', 'solarized-dark', 'solarized', 'system'];
      if (builtInThemes.includes(themeId)) {
        // For built-in themes, just set the body class
        document.body.className = `theme-${themeId}`;
      } else {
        // For custom themes, use the dual-class approach
        const baseThemeToUse = baseTheme || 'dark';
        document.body.className = `theme-${baseThemeToUse}`;
        
        // Remove any existing custom theme classes
        document.body.classList.forEach(cls => {
          if (cls.startsWith('theme-custom-') && cls !== `theme-custom-${themeId}`) {
            document.body.classList.remove(cls);
          }
        });
        
        // Add our specific custom theme class
        document.body.classList.add(`theme-custom-${themeId}`);
      }
      
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

    // Also listen for window events
    window.addEventListener('theme-preview', (event) => {
      const themeId = event.detail.themeId;
      const css = event.detail.css;
      const baseTheme = event.detail.baseTheme;
      
      console.log(`ThemeManagerModal received window theme preview event: ${themeId}`);
      
      // Handle built-in themes differently from custom themes
      const builtInThemes = ['dark', 'light', 'solarized-dark', 'solarized', 'system'];
      if (builtInThemes.includes(themeId)) {
        // For built-in themes, just set the body class
        document.body.className = `theme-${themeId}`;
      } else {
        // For custom themes, use the dual-class approach
        const baseThemeToUse = baseTheme || 'dark';
        document.body.className = `theme-${baseThemeToUse}`;
        
        // Remove any existing custom theme classes
        document.body.classList.forEach(cls => {
          if (cls.startsWith('theme-custom-') && cls !== `theme-custom-${themeId}`) {
            document.body.classList.remove(cls);
          }
        });
        
        // Add our specific custom theme class
        document.body.classList.add(`theme-custom-${themeId}`);
      }
      
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
      this.$emit('close');
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
      console.log(`Applying theme: ${theme.id}`);
      
      try {
        // Save the theme to user settings
        this.$store.dispatch('settings/save', { key: 'theme', value: theme.id });
        
        // Apply the theme directly
        this.loadThemeCssFile(theme.id);
        
        // Update the selected theme
        this.selectedTheme = theme;
        
        // Clear the previewed theme
        this.previewedThemeId = null;
        
        // Mark this theme as active
        this.allThemes.forEach(t => {
          t.isActive = t.id === theme.id;
        });
        
        // Notify the user
        this.$noty.success(`Theme "${theme.name}" applied successfully`);
        
        // Close the modal
        this.$emit('close');
      } catch (error) {
        console.error('Error applying theme:', error);
        this.$noty.error(`Failed to apply theme: ${error.message}`);
      }
    },
    loadThemeCssFile(themeId) {
      console.log(`Applying theme: ${themeId}`);
      
      // Get the theme from the store
      const theme = this.allThemes.find(t => t.id === themeId);
      
      if (!theme) {
        console.error(`Theme not found in store: ${themeId}`);
        return;
      }
      
      // Special handling for themes 1-5 which have their own complete SCSS files
      const baseThemes = ['dark', 'light', 'solarized-dark', 'solarized', 'system'];
      if (baseThemes.includes(themeId)) {
        console.log(`Using built-in theme structure for ${themeId}`);
        
        // Remove any existing theme styles and links
        document.querySelectorAll('style[id^="theme-css-"], style[id^="fallback-theme-"], style[id^="theme-style-"]').forEach(style => {
          style.remove();
        });
        
        document.querySelectorAll('link[id^="theme-css-"]').forEach(link => {
          link.remove();
        });
        
        // Set the body class for the built-in theme - this triggers SCSS imports
        document.body.className = `theme-${themeId}`;
        
        // Notify about the theme change
        this.$root.$emit('theme-preview-changed', { themeId });
        
        // Create a custom event
        const themeChangeEvent = new CustomEvent('theme-preview', { 
          detail: { themeId }
        });
        window.dispatchEvent(themeChangeEvent);
        
        // If we're in an electron environment, apply via IPC
        if (window.electron && window.electron.ipcRenderer) {
          console.log(`Applying built-in theme via IPC: ${themeId}`);
          window.electron.ipcRenderer.send(AppEvent.settingsChanged, { 
            key: 'theme', 
            value: themeId
          });
        }
        
        return null;
      }
      
      // For non-built-in themes, we need to:
      // 1. Use a built-in theme as a base (dark)
      // 2. Apply color overrides specific to our theme
      console.log(`Generating CSS for non-built-in theme: ${themeId}`);
      
      // Remove any existing theme styles
      document.querySelectorAll('style[id^="theme-css-"], style[id^="fallback-theme-"], style[id^="theme-style-"]').forEach(style => {
        style.remove();
      });
      
      document.querySelectorAll('link[id^="theme-css-"]').forEach(link => {
        link.remove();
      });
      
      // Set body class to the base dark theme - this will load the dark structure from app.scss
      document.body.className = 'theme-dark';
      
      // Add additional class for our theme - this allows specific styling without losing the dark theme structure
      document.body.classList.add(`theme-custom-${themeId}`);
      
      // Now generate our color override CSS that targets the custom theme class
      const cssContent = this.generateThemeColorOverrides(theme);
      
      // Apply the CSS directly via a style element
      const style = document.createElement('style');
      style.id = `theme-style-${themeId}`;
      style.textContent = cssContent;
      document.head.appendChild(style);
      
      // Notify the main application about the theme change
      this.$root.$emit('theme-preview-changed', { 
        themeId: themeId,
        css: cssContent,
        baseTheme: 'dark'
      });
      
      // Create a custom event
      const themeChangeEvent = new CustomEvent('theme-preview', { 
        detail: { 
          themeId: themeId, 
          css: cssContent,
          baseTheme: 'dark'
        } 
      });
      window.dispatchEvent(themeChangeEvent);
      
      // If we're in an electron environment, apply via IPC
      if (window.electron && window.electron.ipcRenderer) {
        console.log(`Applying theme via IPC: ${themeId}`);
        window.electron.ipcRenderer.send(AppEvent.settingsChanged, { 
          key: 'theme', 
          value: themeId,
          css: cssContent,
          baseTheme: 'dark'
        });
      }
      
      return cssContent;
    },
    generateThemeColorOverrides(theme) {
      const themeId = theme.id;
      console.log(`Generating color overrides for theme: ${themeId}`);
      
      // Extract colors
      const bg = theme.colors.background;
      const fg = theme.colors.foreground;
      const string = theme.colors.string;
      const keyword = theme.colors.keyword;
      
      // Calculate derived colors
      const bgLighter = this.adjustColor(bg, 15);
      const bgDarker = this.adjustColor(bg, -15);
      const keywordDarker = this.adjustColor(keyword, -20);
      const borderColor = this.adjustColor(bg, 30);
      
      // Generate CSS that only overrides the colors, not the structure
      // Target both the 'theme-dark.theme-custom-{themeId}' (for when both classes are present)
      // and '.theme-custom-{themeId}' class (for direct targeting)
      return `
        /* Color overrides for theme: ${theme.name} (${themeId}) */
        
        /* Base variables - these apply to all elements */
        .theme-dark.theme-custom-${themeId} {
          /* Make sure these CSS variables override the dark theme */
          --theme-bg: ${bg} !important;
          --theme-base: ${fg} !important;
          --theme-string: ${string} !important;
          --theme-keyword: ${keyword} !important;
          --theme-primary: ${keyword} !important;
          --theme-secondary: ${keywordDarker} !important;
          
          /* Core text colors */
          --text-dark: ${fg} !important;
          --text: ${this.adjustColor(fg, -20)} !important;
          --text-light: ${this.adjustColor(fg, -30)} !important;
          --text-lighter: ${this.adjustColor(fg, -40)} !important;
          --text-hint: ${this.adjustColor(fg, -40)} !important;
          --text-disabled: ${this.adjustColor(fg, -40)} !important;
          
          /* App colors */
          --border-color: ${borderColor} !important;
          --link-color: ${fg} !important;
          --selection: ${this.adjustColor(keyword, -40)} !important;
          --query-editor-bg: ${this.adjustColor(bg, -5)} !important;
          --input-highlight: ${this.adjustColor(fg, -40)} !important;
          --sidebar-bg: ${bgDarker} !important;
          --sidebar-fg: ${fg} !important;
          
          /* Core elements need direct styling too */
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        /* Direct element styling for our custom theme */
        .theme-dark.theme-custom-${themeId} .beekeeper-studio-wrapper {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        /* Sidebar styling */
        .theme-dark.theme-custom-${themeId} .sidebar {
          background-color: ${bgDarker} !important;
          color: ${fg} !important;
        }
        
        /* Editor styling */
        .theme-dark.theme-custom-${themeId} .editor, 
        .theme-dark.theme-custom-${themeId} .CodeMirror {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        /* Query editor styling */
        .theme-dark.theme-custom-${themeId} .query-editor {
          background-color: ${this.adjustColor(bg, -5)} !important;
        }
        
        /* Table styling */
        .theme-dark.theme-custom-${themeId} .tabulator-table {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .tabulator-row {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .tabulator-row.tabulator-row-even {
          background-color: ${bgLighter} !important;
        }
        
        /* Button styling */
        .theme-dark.theme-custom-${themeId} .btn-primary {
          background-color: ${keyword} !important;
          color: #ffffff !important;
        }
        
        .theme-dark.theme-custom-${themeId} .btn-secondary {
          background-color: ${keywordDarker} !important;
          color: #ffffff !important;
        }
        
        /* Card and modal styling */
        .theme-dark.theme-custom-${themeId} .theme-card,
        .theme-dark.theme-custom-${themeId} .modal-content {
          background-color: ${bg} !important;
          color: ${fg} !important;
          border-color: ${borderColor} !important;
        }
        
        /* Form control styling */
        .theme-dark.theme-custom-${themeId} input,
        .theme-dark.theme-custom-${themeId} select,
        .theme-dark.theme-custom-${themeId} textarea {
          background-color: ${bgLighter} !important;
          color: ${fg} !important;
          border-color: ${borderColor} !important;
        }
        
        /* Code highlighting styles */
        .theme-dark.theme-custom-${themeId} .cm-string {
          color: ${string} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .cm-keyword {
          color: ${keyword} !important;
        }
        
        /* Status bar styling */
        .theme-dark.theme-custom-${themeId} .statusbar {
          background-color: ${bgDarker} !important;
          color: ${fg} !important;
          border-top: 1px solid ${borderColor} !important;
        }
        
        /* Additional UI components */
        .theme-dark.theme-custom-${themeId} .tabulator-header {
          background-color: ${bgDarker} !important;
          color: ${fg} !important;
        }
        
        .theme-dark.theme-custom-${themeId} .dropdown-menu {
          background-color: ${bg} !important;
          color: ${fg} !important;
        }
      `;
    },
    hexToRgb(hex) {
      // Remove the hash if it exists
      hex = hex.replace(/^#/, '');
      
      // Parse the hex values
      const bigint = parseInt(hex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      
      // Return the RGB values as a string
      return `${r}, ${g}, ${b}`;
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
      const cssContent = this.generateFallbackCSS(themeId);
      
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
      
      this.selectedFile = file;
      this.importing = true;
      this.uploadError = null;
      
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const fileContent = e.target.result;
          const fileExtension = file.name.split('.').pop().toLowerCase();
          
          if (fileExtension === 'json') {
            // Handle JSON theme file
            const themeData = JSON.parse(fileContent);
            
            // Validate theme data
            if (!themeData.name || !themeData.colors) {
              throw new Error('Invalid theme format: missing name or colors');
            }
            
            // Generate a unique ID for the theme
            const themeId = `custom-${Date.now()}`;
            
            // Create a new theme object
            const newTheme = {
              id: themeId,
              name: themeData.name,
              description: themeData.description || 'Custom theme',
              colors: themeData.colors,
              isBuiltIn: false,
              isActive: false
            };
            
            // Add the theme to the store
            this.$store.dispatch('themes/addCustomTheme', newTheme);
            
            // If we're in an electron environment, register the theme
            if (window.electron && window.electron.ipcRenderer) {
              await window.electron.ipcRenderer.invoke('themes/add', newTheme);
            }
            
            // Refresh themes
            await this.loadThemes();
            
            // Select and preview the new theme
            this.previewTheme(newTheme);
            
            this.$noty.success(`Theme "${newTheme.name}" imported successfully`);
          } else if (fileExtension === 'css') {
            // Handle CSS theme file
            // For CSS files, we need to create a basic theme with default colors
            const themeId = `custom-${Date.now()}`;
            const themeName = file.name.replace('.css', '');
            
            // Create a new theme object with default colors
            const newTheme = {
              id: themeId,
              name: themeName,
              description: 'Custom CSS theme',
              colors: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                string: '#ce9178',
                keyword: '#569cd6'
              },
              isBuiltIn: false,
              isActive: false,
              cssContent: fileContent
            };
            
            // Add the theme to the store
            this.$store.dispatch('themes/addCustomTheme', newTheme);
            
            // If we're in an electron environment, register the theme
            if (window.electron && window.electron.ipcRenderer) {
              await window.electron.ipcRenderer.invoke('themes/add', newTheme);
              
              // Save the CSS content
              await window.electron.ipcRenderer.invoke('themes/saveCss', {
                themeId: themeId,
                css: fileContent
              });
            }
            
            // Refresh themes
            await this.loadThemes();
            
            // Select and preview the new theme
            this.previewTheme(newTheme);
            
            this.$noty.success(`Theme "${newTheme.name}" imported successfully`);
          } else if (fileExtension === 'tmtheme' || fileExtension === 'xml') {
            // Handle TextMate/Sublime theme file
            console.log('Processing TextMate/Sublime theme file');
            
            // If we're in an electron environment, use the backend parser
            if (window.electron && window.electron.ipcRenderer) {
              const result = await window.electron.ipcRenderer.invoke('themes/uploadTmTheme', {
                content: fileContent,
                fileName: file.name
              });
              
              if (result.success) {
                console.log('TextMate theme uploaded successfully:', result.theme);
                
                // Create a new theme object
                const newTheme = {
                  id: result.theme.id,
                  name: result.theme.name,
                  description: 'Imported TextMate theme',
                  colors: result.theme.colors,
                  isBuiltIn: false,
                  isActive: false
                };
                
                // Add the theme to the store
                this.$store.dispatch('themes/addCustomTheme', newTheme);
                
                // Refresh themes
                await this.loadThemes();
                
                // Select and preview the new theme
                this.previewTheme(newTheme);
                
                this.$noty.success(`Theme "${newTheme.name}" imported successfully`);
              } else {
                throw new Error(`Failed to parse TextMate theme: ${result.error}`);
              }
            } else {
              // For non-electron environments, create a basic theme
              const themeId = `custom-${Date.now()}`;
              const themeName = file.name.replace(/\.(tmtheme|xml)$/, '');
              
              // Create a new theme object with default colors
              const newTheme = {
                id: themeId,
                name: themeName,
                description: 'Imported TextMate theme',
                colors: {
                  background: '#1e1e1e',
                  foreground: '#d4d4d4',
                  string: '#ce9178',
                  keyword: '#569cd6'
                },
                isBuiltIn: false,
                isActive: false
              };
              
              // Add the theme to the store
              this.$store.dispatch('themes/addCustomTheme', newTheme);
              
              // Refresh themes
              await this.loadThemes();
              
              // Select and preview the new theme
              this.previewTheme(newTheme);
              
              this.$noty.success(`Theme "${newTheme.name}" imported successfully (basic colors)`);
            }
          } else {
            throw new Error('Unsupported file format. Please upload a .json, .css, or .tmTheme file.');
          }
        } catch (error) {
          console.error('Error importing theme:', error);
          this.uploadError = error.message;
          this.$noty.error(`Failed to import theme: ${error.message}`);
        } finally {
          this.importing = false;
          this.selectedFile = null;
          
          // Reset the file input
          this.$refs.fileInput.value = '';
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.uploadError = 'Error reading file';
        this.importing = false;
        this.selectedFile = null;
        this.$noty.error('Error reading file');
        
        // Reset the file input
        this.$refs.fileInput.value = '';
      };
      
      // Accept more file types
      if (file.type === 'application/json' || file.name.endsWith('.json') || 
          file.type === 'text/css' || file.name.endsWith('.css') ||
          file.name.endsWith('.tmTheme') || file.name.endsWith('.xml')) {
        reader.readAsText(file);
      } else {
        this.uploadError = 'Unsupported file format. Please upload a .json, .css, or .tmTheme file.';
        this.importing = false;
        this.selectedFile = null;
        this.$noty.error('Unsupported file format. Please upload a .json, .css, or .tmTheme file.');
        
        // Reset the file input
        this.$refs.fileInput.value = '';
      }
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
      console.log(`Previewing theme: ${theme.id}`);
      
      try {
        // Update UI to show which theme is being previewed
        this.previewedThemeId = theme.id;
        
        // Apply the theme directly
        const cssContent = this.loadThemeCssFile(theme.id);
        
        // Notify the user
        this.$noty.success(`Previewing theme: ${theme.name}`);
      } catch (error) {
        console.error('Error previewing theme:', error);
        this.$noty.error(`Failed to preview theme: ${error.message}`);
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async loadThemes() {
      this.loading = true;
      this.error = null;
      
      try {
        // Fetch themes from the store
        await this.$store.dispatch('themes/fetchThemes');
        
        // Get the current theme
        const currentThemeId = this.themeValue;
        
        // Update the selected theme
        this.selectedTheme = this.allThemes.find(theme => theme.id === currentThemeId) || this.allThemes[0];
        
        // Separate themes into built-in and custom
        this.popularThemes = this.allThemes.filter(theme => theme.isBuiltIn && theme.isPopular);
        this.customThemes = this.allThemes.filter(theme => !theme.isBuiltIn);
        
        // Mark the active theme
        this.allThemes.forEach(theme => {
          theme.isActive = theme.id === currentThemeId;
        });
      } catch (error) {
        console.error('Error loading themes:', error);
        this.error = 'Failed to load themes. Please try again.';
      } finally {
        this.loading = false;
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
  border: 2px solid var(--theme-primary);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.theme-card.previewed {
  border: 2px dashed var(--theme-secondary, #666);
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: var(--theme-secondary, #999);
}

.theme-card.add-theme {
  border: 2px dashed var(--theme-secondary, #666);
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area {
  cursor: pointer;
  padding: 10px;
}

.upload-icon {
  font-size: 24px;
  color: var(--theme-base, #fff);
}

.upload-text {
  margin-top: 10px;
  text-align: center;
  color: var(--theme-base, #fff);
}
</style>
