<template>
  <section class="BksUiKit BksSuperFormatter" ref="super-formatter">
    <div class="core-columns">
      <div v-if="canAddPresets && !addNewPreset" class="presets">
        <label class="form-row">
          Preset
          <select
            @change="handlePresetChange"
            v-model="selectedPresetId"
          >
            <option
              v-for="opt in presetList"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </label>
        <button
          type="button"
          @click.prevent="addPreset"
          class="menu-btn btn btn-fab"
        >
          <i class="material-icons">add_circle</i>
        </button>
      </div>
      <div v-if="addNewPreset" class="presets">
        <label class="form-row">
          Add New Preset
          <input
            type="text"
            ref="addNewPresetInput"
            v-model="addNewPresetName"
          >
        </label>
        <button
          type="button"
          @click.prevent="cancelAdd"
          class="btn btn-sm btn-flat"
        >
          Cancel
        </button>
      </div>
      <div class="formatter-settings">
        <label class="formatter-settings__inputs checkbox form-row">
          <input
            @change="updatePreview"
            v-model="unsavedPreset['useTabs']"
            type="checkbox"
            aria-label="Use Tabs"
          >
          <span>Use Tabs</span>
        </label>
        <label class="formatter-settings__inputs form-row">
          Tab Width
          <input
            @change="updatePreview"
            v-model.number="unsavedPreset['tabWidth']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs form-row">
          Keyword Case
          <select
            @change="updatePreview"
            v-model="unsavedPreset['keywordCase']"
          >
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs form-row">
          Data Type Case
          <select
            @change="updatePreview"
            v-model="unsavedPreset['dataTypeCase']"
          >
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs form-row">
          Function Case
          <select
            @change="updatePreview"
            v-model="unsavedPreset['functionCase']"
          >
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs form-row">
          Expression Width
          <input
            @change="updatePreview"
            v-model.number="unsavedPreset['expressionWidth']"
            type="number"
            max="100"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs form-row">
          Lines Between Queries
          <input
            @change="updatePreview"
            v-model.number="unsavedPreset['linesBetweenQueries']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs checkbox form-row">
          <input
            @change="updatePreview"
            v-model="unsavedPreset['logicalOperatorNewline']"
            type="checkbox"
            aria-label="logical operator new line"
          >
          <span>Logical Operator New Line</span>
        </label>
        <label class="formatter-settings__inputs checkbox form-row">
          <input
            @change="updatePreview"
            v-model="unsavedPreset['newlineBeforeSemicolon']"
            type="checkbox"
            aria-label="new line before semicolon"
          >
          <span>New Line Before Semicolon</span>
        </label>
        <label class="formatter-settings__inputs checkbox form-row">
          <input
            @change="updatePreview"
            v-model="unsavedPreset['denseOperators']"
            type="checkbox"
            aria-label="Use Dense Operators"
          >
          <span>Dense Operators</span>
        </label>
      </div>
    </div>
    <div class="core-columns">
      <!--
        This formatting for pre > code is very important because it's adding all the whitespace
        to the first line of the code presented. Very silly decision
       -->
      <pre><code
        ref="superFormatterCodeBlock"
        class="language-sql"
        v-html="formattedCode"
      /></pre>
    </div>
    <div class="formatter-buttons">
      <slot name="start-footer" />
      <div class="formatter-buttons__btn-group">
        <button
          class="btn btn-flat btn-small"
          type="button"
          @click.prevent="savePreset"
          :disabled="!shouldBeSaved"
          v-if="canAddPresets"
        >
          {{ saveText }}
        </button>
        <button
          class="btn btn-danger"
          type="button"
          @click.prevent="deleteConfig"
          v-if="canAddPresets && canDelete"
        >
          Delete Config
        </button>
      </div>
      <div class="formatter-buttons__btn-group">
        <button
          @click.prevent="copyToClipboard"
          class="btn btn-flat btn-small"
          type="button"
        >
          Copy to Clipboard
        </button>
        <button
          class="btn btn-primary btn-small"
          type="button"
          @click.prevent="applyFormat"
        >
          Apply
        </button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import Vue from 'vue'
import './highlight-beekeeper.css'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import isEqual from 'lodash/isEqual'
import props from './props'
import { format } from 'sql-formatter'

// Register SQL language with highlight.js
hljs.registerLanguage('sql', sql)

export default Vue.extend({
  data() {
    return {
      formattedCode: '',
      unsavedPreset: {
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'preserve',
        dataTypeCase: 'preserve',
        functionCase: 'preserve',
        logicalOperatorNewline: 'before',
        expressionWidth: 50,
        linesBetweenQueries: 1,
        denseOperators: false,
        newlineBeforeSemicolon: false
      },
      selectedPreset: {
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'preserve',
        dataTypeCase: 'preserve',
        functionCase: 'preserve',
        logicalOperatorNewline: 'before',
        expressionWidth: 50,
        linesBetweenQueries: 1,
        denseOperators: false,
        newlineBeforeSemicolon: false
      },
      selectedPresetId: 1,
      addNewPresetName: null,
      addNewPreset: false
    }
  },
  mixins: [],
  props,
  computed: {
    caseOptions() {
      return [
        { value: 'preserve' },
        { value: 'upper' },
        { value: 'lower' }
      ]
    },
    canDelete() {
      const preset = this.presets.find(p => p.id === this.selectedPresetId)
      return preset == null ? false : !preset.systemDefault
    },
    presetList() {
      return this.presets.map(preset => ({
        value: preset.id,
        label: preset.name
      }))
    },
    shouldBeSaved() {
      if (this.addNewPreset) {
        return (this.addNewPresetName != null && this.addNewPresetName !== '')
      } 

      return !isEqual(this.unsavedPreset, this.selectedPreset)
    },
    saveText() {
      if (this.addNewPreset) {
        return 'Add Preset'
      }

      return 'Save Preset'
    }
  },
  methods: {
    highlightCode() {
      this.$nextTick(() => {
        const codeBlock = this.$refs.superFormatterCodeBlock
        if (codeBlock) {
          // Remove previous highlighting
          delete codeBlock.dataset.highlighted
          // Apply new highlighting
          hljs.highlightElement(codeBlock)
        }
      })
    },
    deleteConfig() {
      this.$emit('bks-delete-preset', { id: this.selectedPresetId })
    },
    addPreset() {
      this.addNewPresetName = null
      this.addNewPreset = true
    },
    cancelAdd() {
      this.addNewPresetName = null
      this.addNewPreset = false
      this.unsavedPreset = { ...this.selectedPreset }
    },
    applyFormat() {
      this.$emit('bks-apply-preset', { ...this.unsavedPreset, id: this.selectedPresetId })
    },
    copyToClipboard() {
      this.clipboard.writeText(this.formattedCode)
    },
    updatePreview() {
      this.formattedCode = format(this.value, {
        language: this.formatterDialect,
        ...this.unsavedPreset
      })
    },
    handlePresetChange() {
      const presetValues = this.presets.find(p => p.id === this.selectedPresetId)
      this.unsavedPreset = { ...presetValues.config }
      this.selectedPreset = { ...presetValues.config }
      this.updatePreview()
    },
    savePreset() {
      this.selectedPreset = { ...this.unsavedPreset }
      if (this.addNewPreset) {
        return this.$emit('bks-create-preset', {
          config: this.selectedPreset,
          name: this.addNewPresetName
        })
      }
      this.$emit('bks-save-preset', {
        id: this.selectedPresetId,
        config: this.selectedPreset
      })
    }
  },
  watch: {
    value() {
      this.updatePreview()
    },
    formattedCode() {
      this.highlightCode()
    },
    addNewPreset(addingNewPreset) {
      if (addingNewPreset) {
        this.$nextTick(() => {
          this.$refs.addNewPresetInput.focus()
        })
      }
    },
    presets() {
      this.addNewPresetName = null
      this.addNewPreset = false
    },
    startingPreset(sp) {
      this.selectedPresetId = sp.id ?? 1
    }
  },
  mounted() {
    this.unsavedPreset = { ...this.unsavedPreset, ...this.startingPreset }
    this.selectedPreset = { ...this.selectedPreset, ...this.startingPreset }
    if (this.startingPreset.id != null) this.selectedPresetId = this.startingPreset.id
    this.updatePreview()
  }
})
</script>

<style lang="scss" scoped>
  pre {
    flex: 1;
    min-height: 0;
    padding: 1rem 0.75rem 0.75rem;
    margin: 0;
    overflow-x: scroll;
    overflow-y: auto;
    background-color: var(--query-editor-bg);
    border-radius: 8px;
    user-select: text;
    cursor: text;

    ::selection {
      background: var(--bks-text-editor-selected-bg-color);
    }
  }

  .BksSuperFormatter {
    --background-color: hsl(from var(--theme-bg) h s calc(l + 1));
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 20rem auto;
    grid-template-rows: auto 1.75rem;
    grid-row-gap: 1rem;
    align-items: stretch;
  }

  .core-columns {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .core-columns:first-child {
    overflow-y: auto;
    padding-right: 1rem;
  }

  .formatter-textarea {
    flex: 1;
    resize: none;
    box-sizing: border-box;
    width: 100%;
  }

  .formatter-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    grid-column-start: span 2;

    &__btn-group {
      display: flex;
      gap: 0.5rem;
    }
  }

  .form-row {
    display: flex;
    flex-direction: column;
    font-size: .85rem;
    color: var(--text);
    line-height: 1.5;
    border-radius: 8px;
    padding-block: 0.5rem;

    &.checkbox {
      flex-direction: row;
    }

    &:hover {
      background-color: color-mix(in srgb,
        var(--theme-base) 3.5%,
        var(--theme-bg));
    }

    select {
      background-color: var(--background-color);
    }

    input:not([type="checkbox"]) {
      background-color: var(--background-color);
    }

    select, input  {
      margin-top: 2px;
      font-size: .9rem;
    }
  }

  .presets {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: var(--background-color);

    &:hover {
      background-color: color-mix(in srgb,
        var(--theme-base) 3.5%,
        var(--theme-bg));
    }

    label {
      width: 100%;

      select {
        width: 100%;
      }
    }

    >.btn {
      margin-top: 1.95rem;
    }

    .menu-btn {
      i.material-icons {
        transition: all 0.2s ease-in-out;
        color: var(--text-lighter);
      }

      &:hover,
      &:focus {
        background: none;

        i {
          color: var(--bks-link-color);
        }
      }
    }

    display: flex;
    gap: 0.5rem;
  }
</style>
