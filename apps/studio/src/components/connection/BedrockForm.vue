<template>
  <div class="connection-form">
    <CommonServerInputs
      :config="config"
      :testing="testing"
      :saving="saving"
      :disabled="disabled"
    />

    <CommonAdvanced
      :config="config"
      :testing="testing"
      :saving="saving"
      :disabled="disabled"
    />
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'

export default {
  components: {
    CommonServerInputs,
    CommonAdvanced
  },
  props: {
    config: {
      type: Object,
      required: true
    },
    testing: {
      type: Boolean,
      default: false
    },
    saving: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
}
</script>