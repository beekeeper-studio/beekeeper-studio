<template>
  <toggle-form-area
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
      class="row gutter"
    >
      <label class="col s5">Name</label>
      <label class="col s6">Value</label>
    </div>
    <div
      v-for="(variable, index) in variables"
      :key="index"
      class="row gutter session-variable"
    >
      <div class="col s5 form-group">
        <input
          type="text"
          class="form-control"
          v-model="variable.name"
          placeholder="collation_connection"
          spellcheck="false"
          :disabled="disabled"
        >
      </div>
      <div class="col s6 form-group">
        <input
          type="text"
          class="form-control"
          v-model="variable.value"
          placeholder="utf8mb4_unicode_520_ci"
          spellcheck="false"
          :disabled="disabled"
        >
      </div>
      <div class="col s1 form-group remove-variable">
        <a
          class="a-icon"
          :class="{ disabled }"
          title="Remove variable"
          @click.prevent="!disabled && removeVariable(index)"
        ><i class="material-icons">delete</i></a>
      </div>
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
.remove-variable {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
