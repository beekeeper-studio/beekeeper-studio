<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal data-type-colors-modal">
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Data type colors
            <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
              <i class="material-icons">clear</i>
            </a>
          </div>
          <label class="checkbox-group">
            <input type="checkbox" v-model="settings.enabled">
            <span>
              Enable data type coloring
              <small>Color values by data type</small>
            </span>
          </label>
          <fieldset class="palette-editor" :disabled="!settings.enabled">
            <div class="theme-switch" role="group" aria-label="Color palette theme">
              <button type="button" class="btn btn-sm" :class="theme === 'light' ? 'btn-primary' : 'btn-flat'" @click="theme = 'light'">
                Light
              </button>
              <button type="button" class="btn btn-sm" :class="theme === 'dark' ? 'btn-primary' : 'btn-flat'" @click="theme = 'dark'">
                Dark
              </button>
            </div>
            <div class="color-list">
              <div v-for="family in families" :key="family" class="color-row">
                <label :for="`data-type-color-${theme}-${family}`">{{ labels[family] }}</label>
                <input
                  :id="`data-type-color-${theme}-${family}`"
                  class="color-swatch"
                  type="color"
                  :value="settings[theme][family]"
                  :aria-label="`${labels[family]} color`"
                  @input="setColor(family, $event.target.value)"
                >
                <input
                  class="hex-input"
                  type="text"
                  maxlength="7"
                  :value="settings[theme][family].toUpperCase()"
                  :aria-label="`${labels[family]} color hex value`"
                  @change="setColor(family, $event.target.value)"
                >
              </div>
            </div>
          </fieldset>
        </div>
        <div class="vue-dialog-buttons">
          <button type="button" class="btn btn-flat" @click="resetPalette">
            Reset this palette
          </button>
          <span class="expand" />
          <button type="button" class="btn btn-flat" @click="close">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="save">
            Save
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
import {
  DEFAULT_DATA_TYPE_COLOR_SETTINGS,
  DataTypeColorFamily,
  DataTypeColorSettings,
  normalizeDataTypeColorSettings,
} from '@/common/dataTypeColors'

const families: DataTypeColorFamily[] = ['text', 'number', 'dateTime', 'boolean', 'binary', 'other']

export default Vue.extend({
  data() {
    return {
      modalName: 'data-type-colors-modal',
      settings: normalizeDataTypeColorSettings(undefined) as DataTypeColorSettings,
      theme: 'light' as 'light' | 'dark',
      systemTheme: window.matchMedia('(prefers-color-scheme: dark)'),
      isOpen: false,
      families,
      labels: {
        text: 'Text',
        number: 'Number',
        dateTime: 'Date / Time',
        boolean: 'Boolean',
        binary: 'Binary',
        other: 'Other',
      } as Record<DataTypeColorFamily, string>,
    }
  },
  computed: {
    ...mapGetters('settings', ['themeValue']),
    rootBindings() {
      return [{ event: AppEvent.openDataTypeColors, handler: this.open }]
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
    this.stopListeningForSystemThemeChanges()
  },
  methods: {
    open() {
      const setting = this.$store.getters['settings/settings']?.dataTypeColors?.value
      this.settings = normalizeDataTypeColorSettings(setting)
      this.isOpen = true
      this.theme = this.activePaletteTheme()
      this.listenForSystemThemeChanges()
      this.$modal.show(this.modalName)
    },
    close() {
      this.isOpen = false
      this.stopListeningForSystemThemeChanges()
      this.$modal.hide(this.modalName)
    },
    activePaletteTheme(): 'light' | 'dark' {
      if (this.themeValue === 'system') return this.systemTheme.matches ? 'dark' : 'light'
      return this.themeValue?.includes('dark') ? 'dark' : 'light'
    },
    listenForSystemThemeChanges() {
      if (this.themeValue === 'system') {
        this.systemTheme.addEventListener('change', this.handleSystemThemeChange)
      }
    },
    stopListeningForSystemThemeChanges() {
      this.systemTheme.removeEventListener('change', this.handleSystemThemeChange)
    },
    handleSystemThemeChange() {
      if (this.isOpen && this.themeValue === 'system') this.theme = this.activePaletteTheme()
    },
    setColor(family: DataTypeColorFamily, value: string) {
      if (/^#[\dA-F]{6}$/i.test(value)) this.settings[this.theme][family] = value.toUpperCase()
    },
    resetPalette() {
      this.settings[this.theme] = { ...DEFAULT_DATA_TYPE_COLOR_SETTINGS[this.theme] }
    },
    async save() {
      try {
        await this.$store.dispatch('settings/save', { key: 'dataTypeColors', value: this.settings })
        this.close()
      } catch (error) {
        this.$noty.error('Could not save data type colors')
      }
    },
  },
})
</script>

<style scoped lang="scss">
.checkbox-group {
  align-items: flex-start;

  small {
    display: block;
    margin-top: 0.15rem;
    opacity: 0.65;
  }
}

.palette-editor {
  border: 0;
  margin: 1.25rem 0 0;
  padding: 0;

  &:disabled {
    opacity: 0.45;
  }
}

.theme-switch {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;

  button {
    min-width: 6.5rem;
  }
}

.color-list {
  display: grid;
  gap: 0.6rem;
}

.color-row {
  align-items: center;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: minmax(7rem, 1fr) 2.5rem minmax(6rem, 8rem);

  label {
    font-weight: 500;
  }
}

.color-swatch {
  appearance: none;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 0.4rem;
  cursor: pointer;
  height: 2.4rem;
  padding: 0.2rem;
  width: 2.4rem;

  &::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  &::-webkit-color-swatch {
    border: 0;
    border-radius: 0.2rem;
  }
}

.hex-input {
  background: var(--theme-bg);
  border: 1px solid var(--border-color);
  border-radius: 0.4rem;
  color: var(--text);
  font-family: var(--font-family-mono, monospace);
  height: 2.4rem;
  padding: 0 0.65rem;
  text-transform: uppercase;
  width: 100%;
}

@media (max-width: 480px) {
  .color-row {
    grid-template-columns: minmax(5rem, 1fr) 2.5rem minmax(5.5rem, 7rem);
  }
}
</style>
