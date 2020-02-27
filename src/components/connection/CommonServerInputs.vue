<template>
  <div class="host-port-user-password">
    <div class="row gutter">
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <input type="text" class="form-control" name="host" v-model="config.host">
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <input type="number" class="form-control" name="port" v-model.number="config.port">
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
    <div class="row gutter">
      <div class="col form-group">
        <input type="checkbox" name="rememberPassword" class="form-control" v-model="config.rememberPassword">
        <label for="rememberPassword">Save Password? <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help</i></label>
      </div>
    </div>
    <div class="form-group expand">
      <label for="defaultDatabase">Default Database</label>
      <input type="text" class="form-control" v-model="config.defaultDatabase">
    </div>
  </div>
</template>

<script>
  export default {
    props: ['config']
  }
</script>