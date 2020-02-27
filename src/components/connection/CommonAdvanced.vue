<template>
  <div class="advanced-connection-settings">
    <h4 class="flex">
      <span class="expand">SSH Tunnel</span>
      <i class="material-icons text-2x text-primary" @click.prevent="config.sshEnabled = !config.sshEnabled">{{icon}}</i>
    </h4>
    <div class="advanced-body" v-show="config.sshEnabled">
      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">SSH Hostname</label>
          <input type="text" v-model="config.sshHost">
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">Port</label>
          <input type="number" v-model.number="config.sshPort">
        </div>
      </div>
      <div class="row gutter">
        <h5>SSH Authentication</h5>
        <v-select 
          :options="sshModeOptions"
          @input="setMode"
          :value="config.sshMode"
          :clearable="false"
          :searchable="false"
          :clearSearchOnSelect="false"
          placeholder="Select SSH authentication method"
          ></v-select>
      </div>

      <div v-if="config.sshMode === 'keyfile'" class="row gutter">
        <div class="form-group s9 col">
          <label for="sshKeyfile">Private Key File</label>
          <input class="form-control" type="file" @change="setKeyfile">
        </div>
        <div class="form-group s3 col">
          <label for="sshKeyfilePassword">Key File Password</label>
          <input type="password" class="form-control" v-model="config.sshKeyfilePassword">
          <span class="help">Optional</span>
        </div>
        <div class="col form-group">
          <input type="checkbox" name="rememberPassword" class="form-control" v-model="config.rememberSshKeyfilePassword">
          <label for="rememberPassword">Save Password? <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help</i></label>
        </div>

      </div>
      <div v-if="config.sshMode === 'userpass'" class="row gutter">
        <div class="form-group s6 col">
          <label for="sshUsername">SSH Username</label>
          <input class="form-control" type="text" v-model="config.sshUsername">
        </div>
        <div class="form-group s6 col">
          <label for="sshPassword">SSH Password</label>
          <input type="password" class="form-control" v-model="config.sshPassword">
        </div>
      </div>
      <div class="col form-group">
        <input type="checkbox" name="rememberPassword" class="form-control" v-model="config.rememberSshPassword">
        <label for="rememberPassword">Save Password? <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help</i></label>
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
        console.log("selected", option)
        this.config.sshMode = option.mode
      },
      setKeyfile(e) {
        this.config.sshKeyfile = e.target.files[0].path
      }
    }
  }
</script>