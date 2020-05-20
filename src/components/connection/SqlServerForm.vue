<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>
    <div class="form-group">
      <label for="">Authentication Type</label>
      <select class="form-control" name="" v-model="config.authenticationType" id="">
        <option :selected="config.authenticationType === 'default'" value="default">Default</option>
        <option :selected="config.authenticationType === 'ntlm'" value="ntlm">NTLM (Windows Integrated Auth)</option>
      </select>
    </div>
    <div class="form-group">
      <label for="domain">Domain</label>
      <input type="text" v-model="config.domain" class="form-control">
    </div>
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
