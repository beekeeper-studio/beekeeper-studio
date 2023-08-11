<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" />
    <common-advanced :config="config" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config']

  }
</script>
