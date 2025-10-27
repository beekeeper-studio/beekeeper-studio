<template>
  <div class="trino-form">
    <div class="alert alert-warning">
      <i class="material-icons">warning</i>
      <span>
        Trino support is in alpha.
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/trino">Supported features</a>,
        <a href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">report an issue</a>.
      </span>
    </div>
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
