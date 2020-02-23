<template>
    <div v-if="config.connectionType" class="with-connection-type">
    <div class="row gutter">
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <input type="text" class="form-control" name="host" v-model="config.host">
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <input type="number" class="form-control" name="port" v-model="config.port">
      </div>
    </div>
    <div class="row gutter">
      <div class="col s6 form-group">
        <label for="user">User</label><input type="text" name="user" v-model="config.username" class="form-control">
      </div>
      <div class="col s6 form-group">
        <label for="password">Password</label><input type="password" v-model="config.password" class="form-control">
      </div>
    </div>
    <div class="row">
      <div class="form-group expand">
        <label for="defaultDatabase">Default Database</label>
        <input type="text" class="form-control" v-model="config.defaultDatabase">
      </div>
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
  export default {
    props: ['testing', 'config']

  }
</script>