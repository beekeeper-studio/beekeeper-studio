<template>
  <toggle-form-area
    ref="area"
    title="Session Variables"
    class="session-variables"
    :initially-expanded="variables.length > 0"
  >
    <div class="row alert-row">
      <div class="alert alert-info">
        <i class="material-icons-outlined">info</i>
        <div>
          Applied with <code>SET SESSION</code> on every new connection.
          Numbers and single words are sent as-is, anything else as a quoted string.
        </div>
      </div>
    </div>

    <div
      v-if="variables.length"
      class="session-variable-labels"
    >
      <label>Name</label>
      <label>Value</label>
      <span class="remove-variable" />
    </div>
    <div
      v-for="(variable, index) in variables"
      :key="index"
      class="session-variable"
    >
      <input
        type="text"
        class="form-control"
        v-model="variable.name"
        placeholder="collation_connection"
        spellcheck="false"
        :disabled="disabled"
      >
      <input
        type="text"
        class="form-control"
        v-model="variable.value"
        placeholder="utf8mb4_unicode_520_ci"
        spellcheck="false"
        :disabled="disabled"
      >
      <a
        class="a-icon remove-variable"
        :class="{ disabled }"
        title="Remove variable"
        @click.prevent="!disabled && removeVariable(index)"
      ><i class="material-icons">delete</i></a>
    </div>

    <div class="row flex-middle">
      <span class="expand" />
      <button
        class="btn btn-flat"
        :disabled="disabled"
        @click.prevent="addVariable"
      >
        <i class="material-icons">add</i> Add Variable
      </button>
    </div>
  </toggle-form-area>
</template>

<script>
import ToggleFormArea from '../common/ToggleFormArea.vue'

export default {
  components: { ToggleFormArea },
  props: {
    config: Object,
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    variables() {
      return this.config.options?.sessionVariables || []
    }
  },
  watch: {
    // Show variables that arrive while the form is open, eg from Import from URL
    variables(now, before) {
      if (now.length && !before.length && this.$refs.area) {
        this.$refs.area.toggleContent = true
      }
    }
  },
  methods: {
    setVariables(variables) {
      if (!this.config.options) {
        this.$set(this.config, 'options', {})
      }
      this.$set(this.config.options, 'sessionVariables', variables)
    },
    addVariable() {
      this.setVariables([...this.variables, { name: '', value: '' }])
    },
    removeVariable(index) {
      this.setVariables(this.variables.filter((_v, i) => i !== index))
    }
  }
}
</script>

<style lang="scss" scoped>
.session-variable-labels,
.session-variable {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  > label,
  > input {
    flex: 1 1 0;
    min-width: 0;
  }
}

.session-variable-labels {
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.session-variable {
  margin-bottom: 0.5rem;
}

.remove-variable {
  flex: 0 0 1.5rem;
  justify-content: center;
}
</style>
