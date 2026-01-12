import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

// Language resource loader
const loadedLanguages: string[] = []

// Initial message object, English is empty (will use key as text)
const messages: any = {
  'en': {},  // Empty object, as English will be used as the key names
}

// Default to English
const defaultLocale = 'en'

// Initialize VueI18n instance
const i18n = new VueI18n({
  locale: defaultLocale, 
  fallbackLocale: 'en', 
  messages,
  silentTranslationWarn: true,
  // Set English fallback handling, returns key as text when in English mode
  missing: (locale, key) => {
    if (locale === 'en') return key
    return null
  }
})

/**
 * Dynamically load language files
 * @param locale Language code to load
 */
const loadLanguageAsync = async (locale: string): Promise<string> => {
  // If language is already loaded or is English (English doesn't need resources)
  if (loadedLanguages.includes(locale) || locale === 'en') {
    return Promise.resolve(locale)
  }

  // Dynamically import corresponding language file based on locale
  try {
    let langResource
    
    // Choose which language file to load based on locale
    if (locale === 'zh-CN') {
      langResource = await import('./locales/zh-CN.json')
    } else {
      // If other languages are needed, they can be added here
      console.warn(`Language ${locale} is not supported yet.`)
      return Promise.resolve(defaultLocale)
    }
    
    // Set language messages
    i18n.setLocaleMessage(locale, langResource.default || langResource)
    loadedLanguages.push(locale)
    return Promise.resolve(locale)
  } catch (e) {
    console.error(`Failed to load language file for ${locale}:`, e)
    return Promise.resolve(defaultLocale)
  }
}

/**
 * Set i18n language and ensure language resources are loaded
 * @param locale Target language code
 */
export const setI18nLanguage = async (locale: string): Promise<void> => {
  // Only set when language actually changes
  if (i18n.locale !== locale) {
    // First load language resources
    const loadedLocale = await loadLanguageAsync(locale)
    
    // Set Vue I18n language
    i18n.locale = loadedLocale
    
    // Also set document's language attribute
    document.querySelector('html')?.setAttribute('lang', loadedLocale)
  }
}

export default i18n 