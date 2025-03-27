import Vue from 'vue'
import VueI18n from 'vue-i18n'
import zhCN from './locales/zh-CN.json'

Vue.use(VueI18n)

// 使用any类型以解决类型检查问题
const messages: any = {
  'en': {},  // Empty object, as English will be used as the key names
  'zh-CN': zhCN
}

// Default to English
const defaultLocale = 'en'

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

export const setI18nLanguage = (locale: string) => {
  if (i18n.locale !== locale) {
    i18n.locale = locale
  }
}

export default i18n 