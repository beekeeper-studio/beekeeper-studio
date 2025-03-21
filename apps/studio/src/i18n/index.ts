import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

Vue.use(VueI18n)

const messages = {
  en,
  'zh-CN': zhCN
}

// Default to English
const defaultLocale = 'en'

const i18n = new VueI18n({
  locale: defaultLocale, 
  fallbackLocale: 'en', 
  messages,
  silentTranslationWarn: true 
})

export const setI18nLanguage = (locale: string) => {
  if (i18n.locale !== locale) {
    i18n.locale = locale
  }
}

export default i18n 