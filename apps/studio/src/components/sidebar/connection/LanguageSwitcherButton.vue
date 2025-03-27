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
      try {
        setI18nLanguage(locale)
        
        // Save the user language setting to localStorage
        // Ensure access to settings through key directly, not through the possibly non-existent language object
        await this.$store.dispatch('settings/save', { 
          key: 'language', 
          value: locale,
          _userValue: true // Mark as a user-set value
        })
        
        this.$modal.hide('language-switcher-modal')
        
        // Display success message, show different messages based on the switched language
        if (locale === 'en') {
          this.$noty.success('Language switched to English')
        } else if (locale === 'zh-CN') {
          this.$noty.success('已切换到中文')
        }
      } catch (error) {
        console.error('Error switching language:', error)
        this.$noty.error('Failed to switch language')
      }
    }
  },
  mounted() {
    // Load the user language setting
    try {
      const savedLanguageSetting = this.$store.state.settings.settings.language
      
      // If there is a saved language setting, use it
      if (savedLanguageSetting && savedLanguageSetting.value) {
        setI18nLanguage(savedLanguageSetting.value)
      }
    } catch (error) {
      console.error('Error loading language setting:', error)
      // If there is an error, use the default language (English)
      setI18nLanguage('en')
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