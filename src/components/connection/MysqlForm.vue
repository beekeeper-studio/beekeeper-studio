<template>
  <div v-if="config.connectionType" class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>
    <common-advanced :config="config"></common-advanced>
    <div class="row">
      <div class="btn-group flex flex-right">
        <button :disabled="testing" class="btn btn-flat" @click.prevent="$emit('test')">Test</button>
        <button :disabled="testing" class="btn btn-primary" @click.prevent="$emit('connect')">Connect</button>
      </div>
      
      <!-- Save Connection -->
      <div class="save-connection expand">
        <h3>Save Connection</h3>
        <div class="row">
          <div class="expand"><input class="form-control full" type="text" v-model="config.name" placeholder="Connection Name"></div>
          <div><button class="btn btn-flat" @click.prevent="$emit('save')">Save</button></div>
        </div>
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