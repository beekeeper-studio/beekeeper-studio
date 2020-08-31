<template>
  <div class="host-port-user-password">
    <div class="form-group" v-if="hasSocket && config.connectionType">
      <label for="connection-method-select">Connection Method</label>
      <select name="connectionMethod" class="form-control custom-select" v-model="config.connectionMethod" id="connection-method-select">
        <option :key="t.value" v-for="t in connectionMethods" :value="t.value">{{t.name}}</option>
      </select>
    </div>
    <div class="row gutter" v-show="config.connectionMethod === 'default'">
      <div class="col s9 form-group">
        <label for="host">Host</label>
        <input type="text" class="form-control" @paste="onPaste" name="host" id="host" v-model="config.host">
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <input type="number" class="form-control" name="port" id="port" v-model.number="config.port">
      </div>
    </div>
    <div class="row gutter" v-show="config.connectionMethod === 'socket'">
      <div class="col form-group">
        <label for="socket">Socket</label>
        <input type="text" class="form-control" name="socket" id="socket" v-model="config.socketPath">
      </div>
    </div>
    <label for="ssl" class="checkbox-group row" v-show="config.connectionMethod === 'default'">
      <input id="ssl" type="checkbox" name="ssl" class="form-control" v-model="config.ssl" >
      <span>Enable SSL</span>
    </label>
    <div class="row gutter">
      <div class="col s6 form-group">
        <label for="user">User</label>
        <input type="text" name="user" v-model="config.username" class="form-control">
      </div>
      <div class="col s6 form-group">
        <label for="password">Password</label>
        <input type="password" v-model="config.password" class="form-control">
      </div>
    </div>
    <slot></slot>
    <div class="form-group expand">
      <label for="defaultDatabase">Default Database</label>
      <input type="text" class="form-control" v-model="config.defaultDatabase">
    </div>
  </div>
</template>

<script>

  export default {
    props: ['config'],
    methods: {
      onPaste(event) {
          const data = event.clipboardData.getData('text')
          if (this.config.parse(data)) {
            event.preventDefault()
          }
      }
    },
    computed: {
      connectionMethods() {
        return this.$config.defaults.connectionMethods
      },
      hasSocket() {
        return [
          'mysql',
          'mariadb',
          'postgresql',
          'cockroachdb'
        ].includes(this.config._connectionType)
      }
    }
  }
</script>
