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

    <div class="advanced-connection-settings">
      <h4 class="advanced-heading flex" :class="{enabled: config.ssl}">
        <span class="expand">Enable SSL</span>
        <i class="material-icons" @click.prevent="toggleSsl">
          {{ config.ssl ? 'toggle_on' : 'toggle_off' }}
        </i>
      </h4>
      <div class="advanced-body" v-show="config.ssl">
        <div class="row gutter">
          <div class="col form-group">
            <label>CA Cert</label>
            <file-picker v-model="config.sslCaFile"></file-picker>
          </div>
        </div>

        <div class="row gutter private-key">
          <div class="col s6 form-group">
            <label>Certificate</label>
            <file-picker v-model="config.sslCertFile"></file-picker>
          </div>
          <div class="col s6 form-group">
            <label>Key File</label>
            <file-picker v-model="config.sslKeyFile"></file-picker>
          </div>
        </div>
      </div>
    </div>

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
    <!-- <div class="save-password row gutter">
      <div class="save-passowrd checkbox-group row">
        <input type="checkbox" name="rememberPassword" class="form-control" v-model="config.rememberPassword">
        <label for="rememberPassword">Save Password?</label>
        <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help_outlined</i>
      </div>
    </div> -->
    <div class="form-group expand">
      <label for="defaultDatabase">Default Database</label>
      <input type="text" class="form-control" v-model="config.defaultDatabase">
    </div>
  </div>
</template>

<script>
  import FilePicker from '@/components/form/FilePicker'

  export default {
    props: ['config'],
    components: {
      FilePicker
    },
    methods: {
      toggleSsl() {
        this.config.ssl = !this.config.ssl

        // Remove CA file when disabling ssl
        if (!this.config.ssl) {
          this.config.sslCaFile = ''
          this.config.sslCertFile = ''
          this.config.sslKeyFile = ''
        }
      }
    }
  }
</script>
