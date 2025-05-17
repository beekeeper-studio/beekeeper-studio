import Vue from 'vue';
import { AppEvent } from '../../common/AppEvent';
import { baseThemes } from './ThemeConfigurations';

interface ThemePayload {
  themeId: string
  css?: string
  baseTheme?: string
}

interface ThemeData {
  id: string;
  name: string;
  type: string;
  css: string;
  colors: Record<string, string>;
}

const themes: Record<string, ThemeData> = {};

export async function getThemeByName(name: string): Promise<ThemeData | null> {
  return themes[name] || null;
}

export async function registerCustomTheme(id: string, css: string): Promise<void> {
  themes[id] = {
    id,
    name: id,
    type: 'custom',
    css,
    colors: {}
  };
}

export async function removeCustomTheme(id: string): Promise<void> {
  delete themes[id];
}

export class ThemeService {
  private currentTheme: string | null = null
  private themeStyles: Map<string, HTMLStyleElement> = new Map()
  private root: Vue

  constructor(root: Vue) {
    this.root = root
    this.registerHandlers()
  }

  private registerHandlers(): void {
    this.root.$on('theme-preview-changed', this.handleThemeChange)
  }

  public unregisterHandlers(): void {
    this.root.$off('theme-preview-changed', this.handleThemeChange)
  }

  private handleThemeChange = (payload: ThemePayload): void => {
    const { themeId, css, baseTheme } = payload
    this.applyTheme(themeId, css, baseTheme)
  }

  private async loadThemeFile(themeId: string, cssContent?: string, baseTheme?: string): Promise<void> {
    try {
      // For system theme, we need to handle both light and dark variants
      if (themeId === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        themeId = prefersDark ? 'dark' : 'light'
      }

      // Store the current theme ID
      this.currentTheme = themeId

      // Remove any existing theme styles
      document.querySelectorAll('style[id^="theme-css-"], style[id^="theme-style-"]').forEach(style => {
        style.remove()
      })

      // For base themes, we need to load their SCSS files
      if (baseThemes.includes(themeId)) {
        // The SCSS files are already imported in app.scss and will be applied
        // when we set the body class
        document.body.className = `theme-${themeId}`
        return
      }

      // For custom themes, use a base theme as foundation
      const baseThemeToUse = baseTheme || 'dark'
      document.body.className = `theme-${baseThemeToUse}`

      // Remove any existing custom theme classes
      document.body.classList.forEach(cls => {
        if (cls.startsWith('theme-custom-') && cls !== `theme-custom-${themeId}`) {
          document.body.classList.remove(cls)
        }
      })

      // Add custom theme class
      document.body.classList.add(`theme-custom-${themeId}`)

      // Apply custom CSS if provided
      if (cssContent) {
        const style = document.createElement("style")
        style.id = `theme-style-${themeId}`
        style.textContent = cssContent
        document.head.appendChild(style)
        this.themeStyles.set(themeId, style)
      }

      // Notify the main application about the theme change
      this.root.$emit(AppEvent.settingsChanged, {
        key: 'theme',
        value: themeId,
        css: cssContent,
        baseTheme: baseThemeToUse
      })

    } catch (error) {
      console.error(`Error loading theme ${themeId}:`, error)
      // Fallback to dark theme if there's an error
      document.body.className = 'theme-dark'
    }
  }

  private applyTheme(themeId: string, cssContent?: string, baseTheme?: string): void {
    this.loadThemeFile(themeId, cssContent, baseTheme)
  }

  // Add a getter for currentTheme
  public getCurrentTheme(): string | null {
    return this.currentTheme
  }
} 
