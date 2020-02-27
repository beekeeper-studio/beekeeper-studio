<template>
  <div v-if="config.connectionType" class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>
    <common-advanced :config="config"></common-advanced>
    <div class="row flex-middle">
      <!-- TODO MATTHEW: Not sure if this breaks this -->
      <div class="checkbox-group row">
        <input type="checkbox" name="rememberPassword" class="form-control" v-model="config.rememberPassword">
        <label for="rememberPassword">Save Passwords?</label>
        <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help_outlined</i>
      </div>
      <span class="expand"></span>
      <div class="btn-group">
        <button :disabled="testing" class="btn btn-flat" @click.prevent="$emit('test')">Test</button>
        <button :disabled="testing" class="btn btn-primary" @click.prevent="$emit('connect')">Connect</button>
      </div>
    </div>

    <!-- Save Connection -->
    <div class="save-connection expand">
      <h3>Save Connection</h3>
      <div class="row">
        <div class="expand"><input class="form-control" type="text" v-model="config.name" placeholder="Connection Name"></div>
        <div><button class="btn btn-flat" @click.prevent="$emit('save')">Save</button></div>
      </div>
    </div>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['testing', 'config']

  }
</script>
