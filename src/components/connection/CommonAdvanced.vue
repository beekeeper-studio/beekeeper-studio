<template>
  <div class="advanced-connection-settings">
    <h4 class="advanced-heading flex" :class="{enabled: config.sshEnabled}">
      <span class="expand">SSH Tunnel</span>
      <i class="material-icons" @click.prevent="config.sshEnabled = !config.sshEnabled">{{icon}}</i>
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
        <div class="col form-group">
          <label for="bastionHost">Bastion Host (Jump Host)</label>
          <input class="form-control" v-model="config.sshBastionHost" type="text" name="bastionHost">
        </div>
      </div>
      <div class="form-group">
        <label>SSH Authentication</label>
        <select class="form-control" v-model="config.sshMode">
          <option v-for="option in sshModeOptions" :key="option.mode" :value="option.mode">{{option.label}}</option>
        </select>
      </div>



      <div v-if="config.sshMode === 'keyfile'" class="private-key row gutter">
        <div class="col">
          <div class="form-group">
            <label for="sshUsername">SSH Username</label>
            <input class="form-control" type="text" v-model="config.sshUsername">
          </div>
        </div>
        <div class="col s6 form-group">
          <label for="sshKeyfile">Private Key File</label>
          <file-picker
            v-model="config.sshKeyfile"
            :show-hidden-files="true"
            :default-path="filePickerDefaultPath">
          </file-picker>
        </div>
        <div class="col s6 form-group">
          <label for="sshKeyfilePassword">Key File PassPhrase <span class="hint">(Optional)</span></label>
          <input type="password" class="form-control" v-model="config.sshKeyfilePassword">
        </div>

      </div>
      <div v-if="config.sshMode === 'userpass'" class="row gutter">
        <div class="col s6">
          <div class="form-group">
            <label for="sshUsername">SSH Username</label>
            <input class="form-control" type="text" v-model="config.sshUsername">
          </div>
        </div>
        <div class="col s6">
          <div class="form-group">
            <label for="sshPassword">SSH Password</label>
            <input class="form-control" type="password" v-model="config.sshPassword">
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
<script>
  import FilePicker from '@/components/form/FilePicker'

  import { remote } from 'electron'
  import { join as pathJoin } from 'path'

  export default {
    props: ['config'],
    components: {
      FilePicker
    },
    data() {
      return {
        sshModeOptions: [
          { label: "Key File", mode: 'keyfile' },
          { label: "Username & Password", mode: "userpass" }
        ],
        filePickerDefaultPath: pathJoin(remote.app.getPath('home'), '.ssh')
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
      }
    }
  }
</script>
