import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

// 语言资源加载器
const loadedLanguages: string[] = []

// 初始消息对象，英文为空（将使用key作为文本）
const messages: any = {
  'en': {},  // Empty object, as English will be used as the key names
}

// 默认使用英文
const defaultLocale = 'en'

// 初始化VueI18n实例
const i18n = new VueI18n({
  locale: defaultLocale, 
  fallbackLocale: 'en', 
  messages,
  silentTranslationWarn: true,
  // 设置英文的fallback处理，当处于英文模式时返回key作为文本
  missing: (locale, key) => {
    if (locale === 'en') return key
    return null
  }
})

/**
 * 动态加载语言文件
 * @param locale 要加载的语言代码
 */
const loadLanguageAsync = async (locale: string): Promise<string> => {
  // 如果语言已加载或是英文（英文不需要加载资源）
  if (loadedLanguages.includes(locale) || locale === 'en') {
    return Promise.resolve(locale)
  }

  // 根据locale动态导入对应语言文件
  try {
    let langResource
    
    // 基于locale决定加载哪个语言文件
    if (locale === 'zh-CN') {
      langResource = await import('./locales/zh-CN.json')
    } else {
      // 如果需要其他语言，可以在这里添加
      console.warn(`Language ${locale} is not supported yet.`)
      return Promise.resolve(defaultLocale)
    }
    
    // 设置语言消息
    i18n.setLocaleMessage(locale, langResource.default || langResource)
    loadedLanguages.push(locale)
    return Promise.resolve(locale)
  } catch (e) {
    console.error(`Failed to load language file for ${locale}:`, e)
    return Promise.resolve(defaultLocale)
  }
}

/**
 * 设置i18n语言并确保语言资源已加载
 * @param locale 目标语言代码
 */
export const setI18nLanguage = async (locale: string): Promise<void> => {
  // 仅在语言实际变化时才设置
  if (i18n.locale !== locale) {
    // 先加载语言资源
    const loadedLocale = await loadLanguageAsync(locale)
    
    // 设置Vue I18n语言
    i18n.locale = loadedLocale
    
    // 同时设置文档的语言属性
    document.querySelector('html')?.setAttribute('lang', loadedLocale)
  }
}

export default i18n 