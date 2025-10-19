<template>
  <section class="BksUiKit BksSuperFormatter" ref="super-formatter">
    <div class="core-columns">
      <div v-if="canAddPresets && !addNewPreset" class="presets">
        <label>
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
        <label>
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
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Use Tabs</span>
          <span class="switch-control">
            <input
              @change="updatePreview"
              v-model="unsavedPreset['useTabs']"
              type="checkbox"
              aria-label="Use Tabs"
            >
            <span class="slider" />
          </span>
        </label>
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Logical Operator New Line</span>
          <span class="switch-control">
            <input
              @change="updatePreview"
              v-model="unsavedPreset['logicalOperatorNewline']"
              type="checkbox"
              aria-label="logical operator new line"
            >
            <span class="slider" />
          </span>
          <span class="slider" />
        </label>
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs">
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
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Dense Operators</span>
          <span class="switch-control">
            <input
              @change="updatePreview"
              v-model="unsavedPreset['denseOperators']"
              type="checkbox"
              aria-label="Use Dense Operators"
            >
            <span class="slider" />
          </span>
        </label>
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">New Line Before Semicolon</span>
          <span class="switch-control">
            <input
              @change="updatePreview"
              v-model="unsavedPreset['newlineBeforeSemicolon']"
              type="checkbox"
              aria-label="new line before semicolon"
            >
            <span class="slider" />
          </span>
        </label>
      </div>
      <div class="formatter-buttons">
        <div class="formatter-buttons__btn-group">
          <button
            class="btn btn-small"
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
            class="btn btn-small"
            type="button"
          >
            Copy to Clipboard
          </button>
          <button
            class="btn btn-small"
            type="button"
            @click.prevent="applyFormat"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
    <div class="core-columns">
      <p>
        Preview
      </p>
      <textarea
        class="formatter-textarea"
        readonly
        v-model="value"
      />
    </div>
  </section>
</template>

<script lang="ts">
import Vue from "vue"
import isEqual from 'lodash/isEqual'
import props from './props'
import { format } from 'sql-formatter'

export default Vue.extend({
  data() {
    return {
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
      // TODO: Does it make more sense to have the unsaved or the save preset as what's sent over? What if they don't want to save it?
      this.$emit('bks-apply-preset', { ...this.unsavedPreset, id: this.selectedPresetId })
    },
    copyToClipboard() {
      this.clipboard(this.value)
    },
    updatePreview() {
      this.value = format(this.value, {
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
  }
})
</script>

<style lang="scss" scoped>
  .BksSuperFormatter {
    display: grid;
    grid-template-columns: 2fr 1fr; /* 2/3 and 1/3 */
    gap: 2rem;
    align-items: stretch;
  }

  .core-columns {
    display: flex;
    flex-direction: column;
  }

  .formatter-settings {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .formatter-textarea {
    flex: 1;
    resize: none;
    box-sizing: border-box;
    width: 100%;
  }

  .formatter-buttons {
    padding-top: 2rem;
    display: flex;
    justify-content: space-between;
    &__btn-group {
      display: flex;
      gap: 1rem;
    }
  }

  .presets {
    label {
      width: 90%;
    }
    padding-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    flex-wrap: nowrap;
    align-items: flex-end;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 1.5rem;

    .switch-label {
      font-size: 14px;
    }

    .switch-control {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;

      input {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }

      .slider {
        position: absolute;
        inset: 0;
        background-color: #ccc;
        border-radius: 28px;
        transition: background-color 0.3s;

        &::before {
          content: "";
          position: absolute;
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
        }
      }

      input:checked + .slider {
        background-color: #4CAF50;

        &::before {
          transform: translateX(22px);
        }
      }
    }
  }

</style>
