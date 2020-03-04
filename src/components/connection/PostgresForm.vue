<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>
    <common-advanced :config="config"></common-advanced>
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
