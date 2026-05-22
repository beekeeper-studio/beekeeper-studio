<template>
  <div class="with-connection-type">
    <!-- FIXME Clickhouse client supports custom SSL certificates -->
    <common-server-inputs :config="config" :support-complex-s-s-l="false" />
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
