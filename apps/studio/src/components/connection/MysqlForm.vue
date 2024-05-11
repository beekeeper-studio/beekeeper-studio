<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" />
    <common-advanced :config="config" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config']

  }
</script>
