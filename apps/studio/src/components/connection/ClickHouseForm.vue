<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" :support-complex-s-s-l="true" :disabled="disabled" />
    <common-advanced :config="config" :disabled="disabled" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: {
      config: Object,
      disabled: {
        type: Boolean,
        default: false
      }
    }

  }
</script>
