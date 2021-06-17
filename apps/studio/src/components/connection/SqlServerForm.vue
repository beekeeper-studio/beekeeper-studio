<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config">
      <div class="form-group">
        <label for="domain">
          Domain
          <i class="material-icons" v-tooltip="'Set \'domain\' to be logged in using Windows Integrated Authentication (NTLM)'">help_outlined</i>
          </label>
        <input type="text" v-model="config.domain" class="form-control">
      </div>
    </common-server-inputs>
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
