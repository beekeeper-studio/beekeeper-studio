<template>
  <div class="language-switcher-button">
    <a
      class="nav-item language"
      :title="String($t('Switch Language'))"
      @click.prevent="showLanguageModal"
    >
      <span class="avatar">
        <i class="material-icons">language</i>
      </span>
    </a>
    <modal
      class="beekeeper-dialog vue-dialog language-switcher-modal"
      name="language-switcher-modal"
      height="auto"
      :scrollable="true"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          {{ $t('Language Settings') }}
        </div>
        <div class="list-group">
          <div class="list-body">
            <div
              class="list-item language"
              v-for="lang in availableLanguages"
              :key="lang.code"
            >
              <a class="list-item-btn" @click="switchLanguage(lang.code)">
                <div class="content expand">
                  <div class="title">{{ lang.name }}</div>
                </div>
                <div v-if="currentLocale === lang.code" class="selected-indicator">
                  <i class="material-icons">check</i>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="$modal.hide('language-switcher-modal')"
        >
          {{ $t('Close') }}
        </button>
      </div>
    </modal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { setI18nLanguage } from '@/i18n'

export default Vue.extend({
  data() {
    return {
      availableLanguages: [
        { code: 'en', name: 'English' },
        { code: 'zh-CN', name: '中文 (简体)' }
      ]
    }
  },
  computed: {
    currentLocale(): string {
      return this.$i18n.locale
    }
  },
  methods: {
    showLanguageModal() {
      this.$modal.show('language-switcher-modal')
    },
    async switchLanguage(locale: string) {
      // Update i18n language setting
      setI18nLanguage(locale)
      
      // Save user language setting to local storage, including _userValue to indicate it's a user-set value
      await this.$store.dispatch('settings/save', { 
        key: 'language', 
        value: locale,
        _userValue: true // Mark as user-set
      })
      
      this.$modal.hide('language-switcher-modal')
      
      // 显示成功消息，根据切换的语言显示不同的消息
      if (locale === 'en') {
        this.$noty.success('Language switched to English')
      } else if (locale === 'zh-CN') {
        this.$noty.success('已切换到中文')
      }
    }
  },
  mounted() {
    // 加载语言设置，只有当用户手动设置过时才应用
    const savedLanguageSetting = this.$store.state.settings.settings.language
    if (savedLanguageSetting && savedLanguageSetting.value && savedLanguageSetting._userValue) {
      setI18nLanguage(savedLanguageSetting.value)
    }
  }
})
</script>

<style lang="scss" scoped>
.language-switcher-modal {
  .list-group {
    min-height: 0!important;
    .list-item {
      padding-left: 0;
      padding-right: 0;
      cursor: pointer;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }
  
  .content {
    line-height: 1.6;
  }
  
  .selected-indicator {
    color: var(--theme-primary);
  }
}
</style> 