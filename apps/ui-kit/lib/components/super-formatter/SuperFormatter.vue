<template>
  <section class="BksUiKit BksSuperFormatter" ref="super-formatter">
    <div class="core-columns">
      <div v-if="canAddPresets" class="presets">
        <label>
          Preset
          <select></select>
        </label>
      </div>
      <div class="formatter-settings">
        <label class="formatter-settings__inputs">
          Tab Width
          <input
            v-model="unsavedPreset['tabWidth']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Use Tabs</span>
          <span class="switch-control">
            <input v-model="unsavedPreset['useTabs']" type="checkbox" aria-label="Use Tabs">
            <span class="slider" />
          </span>
        </label>
        <label class="formatter-settings__inputs">
          Keyword Case
          <select v-model="unsavedPreset['keywordCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs">
          Data Type Case
          <select v-model="unsavedPreset['dataTypeCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs">
          Function Case
          <select v-model="unsavedPreset['functionCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Logical Operator New Line</span>
          <span class="switch-control">
            <input v-model="unsavedPreset['logicalOperatorNewline']" type="checkbox" aria-label="logical operator new line">
            <span class="slider" />
          </span>
          <span class="slider" />
        </label>
        <label class="formatter-settings__inputs">
          Expression Width
          <input
            v-model="unsavedPreset['expressionWidth']"
            type="number"
            max="100"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs">
          Lines Between Queries
          <input
            v-model="unsavedPreset['linesBetweenQueries']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">Dense Operators</span>
          <span class="switch-control">
            <input v-model="unsavedPreset['denseOperators']" type="checkbox" aria-label="Use Dense Operators">
            <span class="slider" />
          </span>
        </label>
        <label class="formatter-settings__inputs switch">
          <span class="sr-only">New Line Before Semicolon</span>
          <span class="switch-control">
            <input v-model="unsavedPreset['newlineBeforeSemicolon']" type="checkbox" aria-label="new line before semicolon">
            <span class="slider" />
          </span>
        </label>
      </div>
      <div class="formatter-buttons">
        <button
          class="btn btn-small"
          type="button"
          v-if="canAddPresets"
        >
          Save preset
        </button>
        <div class="formatter-buttons__btn-group">
          <button
            class="btn btn-small"
            type="button"
          >
            Copy to Clipboard
          </button>
          <button
            class="btn btn-small"
            type="button"
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
      <div>
        {{ value }}
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import Vue from "vue"
import props from './props'
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
      selectedPreset: {}
    }
  },
  mixins: [],
  props,
  watch: {
    entities() {
      if (!this.textEditor) return
      this.applyCompletionSource()
    },
  },
  computed: {
    caseOptions() {
      return [
        { value: 'preserve' },
        { value: 'upper' },
        { value: 'lower' }
      ]
    }
  },
  methods: {
    
  },
  mounted() {
    this.unsavedPreset = { ...this.unsavedPreset, ...this.defaultPreset }
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
    padding-bottom: 2rem;
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
