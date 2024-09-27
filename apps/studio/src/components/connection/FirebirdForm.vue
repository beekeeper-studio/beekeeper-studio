<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config">
      <template v-slot:header>
        <div class="alert alert-warning">
          <i class="material-icons-outlined">warning</i>
          <span>Firebird 3+ wire protocol is not supported yet. You'll need to enable legacy authentication. Please refer to the <a href="https://docs.beekeeperstudio.io/user_guide/connecting/firebird/">documentation</a>.</span>
        </div>
      </template>
    </common-server-inputs>
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
