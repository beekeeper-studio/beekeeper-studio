<template>
  <div class="advanced-connection-settings">
    <h4><span class="expand">SSH Tunnel</span> <i class="material-icons" @click.prevent="config.sshEnabled = !config.sshEnabled">{{icon}}</i></h4>
    <div class="advanced-body" v-show="config.sshEnabled">
      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">SSH Hostname</label>
          <input type="text" v-model="config.sshHost">
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">Port</label>
          <input type="text" v-model="config.sshPort">
        </div>
      </div>
      <div class="row gutter">
        <h5>SSH Authentication</h5>
        <v-select :options="sshModeOptions" @input="setMode" :value="config.sshMode"></v-select>
      </div>

      <div v-if="config.sshMode === 'keyfile'" class="row gutter">
        <div class="form-group s9 col">
          <label for="sshKeyfile">Private Key File</label>
          <input type="file" @change="setKeyfile">
        </div>
        <div class="form-group s3 col">
          <label for="sshKeyfilePassword">Key File Password</label>
          <input type="password" v-model="config.sshKeyfilePassword">
          <span class="help">Optional</span>
        </div>
      </div>

    </div>
  </div>
</template>
<script>
  export default {
    props: ['config'],
    data() {
      return {
        sshModeOptions: [
          { label: "Key File", mode: 'keyfile' },
          { label: "Username & Password", mode: "userpass" }
        ]
      }
    },
    computed: {
      icon() {
        return this.config.sshEnabled ? 'toggle_on' : 'toggle_off'
      }
    },
    methods: {
      setMode(option) {
        this.config.sshMode = option.mode
      },
      setKeyfile(e) {
        this.config.sshKeyfile = e.target.files[0].name
      }
    }
  }
</script>