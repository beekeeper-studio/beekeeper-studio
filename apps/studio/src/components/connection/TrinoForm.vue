<template>
  <div class="trino-form">
    <div class="with-connection-type">
      <common-server-inputs :config="config" />
    </div>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'

  export default {
    components: { CommonServerInputs },
    props: ['config']

  }
</script>
