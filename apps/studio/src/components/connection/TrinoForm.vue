<template>
  <div class="trino-form">
    <div class="with-connection-type">
      <common-server-inputs :config="config" :disabled="disabled" />
    </div>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'

  export default {
    components: { CommonServerInputs },
    props: {
      config: Object,
      disabled: {
        type: Boolean,
        default: false
      }
    }

  }
</script>
