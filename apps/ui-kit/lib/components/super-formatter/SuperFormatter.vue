<template>
  <section class="BksUiKit BksSuperFormatter" ref="super-formatter">
    <div class="core-columns">
      <div v-if="canAddPresets">
        add presets
      </div>
      <div class="preset-form">
        <label class="preset-form__inputs">
          <span>tab width</span>
          <input
            v-model="unsavedPreset['tabWidth']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="preset-form__inputs switch">
          <span class="sr-only">Use Tabs</span>
          <input v-model="unsavedPreset['useTabs']" type="checkbox">
          <span class="slider" />
        </label>
        <label class="preset-form__inputs">
          keyword case
          <select v-model="unsavedPreset['keywordCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="preset-form__inputs">
          data type case
          <select v-model="unsavedPreset['dataTypeCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="preset-form__inputs">
          function case
          <select v-model="unsavedPreset['functionCase']">
            <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
              {{ opt.value }}
            </option>
          </select>
        </label>
        <label class="preset-form__inputs switch">
          <span class="sr-only">logical operator new line</span>
          <input v-model="unsavedPreset['logicalOperatorNewline']" type="checkbox">
          <span class="slider" />
        </label>
        <label class="preset-form__inputs">
          expression width
          <input
            v-model="unsavedPreset['expressionWidth']"
            type="number"
            max="100"
            min="1"
            step="1"
          >
        </label>
        <label class="preset-form__inputs">
          lines between queries
          <input
            v-model="unsavedPreset['linesBetweenQueries']"
            type="number"
            max="20"
            min="1"
            step="1"
          >
        </label>
        <label class="preset-form__inputs switch">
          <span class="sr-only">Dense Operators</span>
          <input v-model="unsavedPreset['denseOperators']" type="checkbox">
          <span class="slider" />
        </label>
        <label class="preset-form__inputs switch">
          <span class="sr-only">new line before semicolon</span>
          <input v-model="unsavedPreset['newlineBeforeSemicolon']" type="checkbox">
          <span class="slider" />
        </label>
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
      language: ''
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
    gap: 1rem;
    align-items: stretch;
  }

  .core-columns {
    display: flex;
    flex-direction: column;
  }

  .preset-form {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .switch {
    display: flex;
    gap: 0.5rem; // space between text and slider
    flex-direction: column;
    cursor: pointer;

    .switch-label {
      font-size: 14px;
      cursor: pointer;
    }

    input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute; // keep it accessible but hidden
    }

    .slider {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
      background-color: #ccc;
      border-radius: 28px;
      transition: background-color 0.3s;
      flex-shrink: 0; // don’t let it shrink

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


// Hide text visually but keep it for screen readers

</style>
