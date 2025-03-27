import Vue from 'vue'
import VueI18n from 'vue-i18n'
import zhCN from './locales/zh-CN.json'

Vue.use(VueI18n)

const messages: any = {
  'en': {},  // Empty object, as English will be used as the key names
  'zh-CN': zhCN
}

// Default to English
const defaultLocale = 'en'

// Initialize the VueI18n instance
const i18n = new VueI18n({
  locale: defaultLocale, 
  fallbackLocale: 'en', 
  messages,
  silentTranslationWarn: true,
  // Set a fallback handler for English, which returns the key name as the text when in English mode
  missing: (locale, key) => {
    if (locale === 'en') return key
    return null
  }
})

/**
 * Set the i18n language
 * @param locale The target language code
 */
export const setI18nLanguage = (locale: string) => {
  // Only set when the language actually changes
  if (i18n.locale !== locale) {
    i18n.locale = locale
    // Also set the language attribute of the document
    document.querySelector('html')?.setAttribute('lang', locale)
  }
}

export default i18n 