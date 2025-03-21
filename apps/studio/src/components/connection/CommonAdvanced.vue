<template>
  <toggle-form-area
    :title="$t('connection.ssh.title')"
    hide-toggle="true"
    :expanded="config.sshEnabled"
  >
    <template v-slot:header>
      <x-switch
        @click.prevent="config.sshEnabled = !config.sshEnabled"
        :toggled="config.sshEnabled"
      />
    </template>
    <template>
      <div class="row gutter">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>{{ $t('connection.ssh.info') }}</div>
        </div>
      </div>
      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">{{ $t('connection.ssh.hostname') }}</label>
          <input
            type="text"
            v-model="config.sshHost"
          >
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">{{ $t('connection.ssh.port') }}</label>
          <input
            type="number"
            v-model.number="config.sshPort"
          >
        </div>
      </div>
      <div class="row gutter">
        <div class="col s8 form-group">
          <label for="bastionHost">{{ $t('connection.ssh.bastionHost') }}</label>
          <input
            class="form-control"
            v-model="config.sshBastionHost"
            type="text"
            name="bastionHost"
          >
        </div>
        <div class="col s4 form-group">
          <label for="sshKeepaliveInterval">
            {{ $t('connection.ssh.keepaliveInterval') }} <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{ content: $t('connection.ssh.keepaliveIntervalTooltip'), html: true}"
            >help_outlined</i>
          </label>
          <input
            type="number"
            v-model.number="config.sshKeepaliveInterval"
            name="sshKeepaliveInterval"
            :placeholder="$t('connection.ssh.keepaliveIntervalPlaceholder')"
          >
        </div>
      </div>
      <div class="form-group">
        <label>{{ $t('connection.ssh.authentication') }}</label>
        <select
          class="form-control"
          v-model="config.sshMode"
        >
          <option
            v-for="option in sshModeOptions"
            :key="option.mode"
            :value="option.mode"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div
        v-if="config.sshMode === 'agent'"
        class="agent flex-col"
      >
        <div class="form-group">
          <label for="sshUsername">{{ $t('connection.ssh.username') }}</label>
          <input
            class="form-control"
            type="text"
            v-model="config.sshUsername"
          >
        </div>
        <div
          class="alert alert-warning"
          v-if="$config.isSnap"
        >
          <i class="material-icons">error_outline</i>
          <div>
            {{ $t('connection.ssh.agentInfo.snapWarning') }}
            <external-link :href="enableSshLink">
              {{ $t('connection.ssh.agentInfo.readMore') }}
            </external-link>
          </div>
        </div>
        <div
          v-else-if="$config.sshAuthSock"
          class="alert alert-success"
        >
          <i class="material-icons">check</i>
          <div>{{ $t('connection.ssh.agentInfo.agentFound') }}</div>
        </div>
        <div
          v-else-if="$config.isWindows"
          class="alert alert-info"
        >
          <i class="material-icons-outlined">info</i>
          <div>{{ $t('connection.ssh.agentInfo.windowsInfo') }}</div>
        </div>
        <div
          v-else
          class="alert alert-warning"
        >
          <i class="material-icons">error_outline</i>
          <div>{{ $t('connection.ssh.agentInfo.noAgentWarning') }}</div>
        </div>
      </div>

      <div
        v-if="config.sshMode === 'keyfile'"
        class="private-key gutter"
      >
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="sshUsername">{{ $t('connection.ssh.username') }}</label>
              <input
                class="form-control"
                type="text"
                v-model="config.sshUsername"
              >
            </div>
          </div>
        </div>
        <div
          v-if="$config.isSnap && !$config.snapSshPlug"
          class="row"
        >
          <div class="alert alert-warning">
            <i class="material-icons">error_outline</i>
            <div>
              {{ $t('connection.ssh.keyfile.snapWarning') }} <external-link :href="enableSshLink">
                {{ $t('connection.ssh.agentInfo.readMore') }}
              </external-link>
            </div>
          </div>
        </div>
        <div class="row gutter">
          <div class="col s6 form-group">
            <label for="sshKeyfile">{{ $t('connection.ssh.keyfile.privateKey') }}</label>
            <file-picker
              v-model="config.sshKeyfile"
              :show-hidden-files="true"
              :default-path="filePickerDefaultPath"
            />
          </div>
          <div class="col s6 form-group">
            <label for="sshKeyfilePassword">{{ $t('connection.ssh.keyfile.passphrase') }} <span class="hint">({{ $t('connection.ssh.keyfile.optional') }})</span></label>
            <input
              type="password"
              class="form-control"
              v-model="config.sshKeyfilePassword"
            >
          </div>
        </div>
      </div>
      <div
        v-if="config.sshMode === 'userpass'"
        class="row gutter"
      >
        <div class="col s6">
          <div class="form-group">
            <label for="sshUsername">{{ $t('connection.ssh.username') }}</label>
            <input
              class="form-control"
              type="text"
              v-model="config.sshUsername"
            >
          </div>
        </div>
        <div class="col s6">
          <div class="form-group">
            <label for="sshPassword">{{ $t('connection.ssh.password') }}</label>
            <input
              class="form-control"
              type="password"
              v-model="config.sshPassword"
            >
          </div>
        </div>
      </div>
    </template>
  </toggle-form-area>
</template>
<script>
import FilePicker from '@/components/common/form/FilePicker.vue'
import ExternalLink from '@/components/common/ExternalLink.vue'

import ToggleFormArea from '../common/ToggleFormArea.vue'

  export default {
    props: ['config'],
    components: {
    FilePicker, ExternalLink,
    ToggleFormArea
},
    data() {
      return {
        enableSshLink: "https://docs.beekeeperstudio.io/pages/linux#ssh-key-access-for-the-snap",
        filePickerDefaultPath: this.$config.homeDirectory ? window.main.join(this.$config.homeDirectory, '.ssh') : ''
      }
    },
    computed: {
      sshModeOptions() {
        return [
          { label: this.$t('connection.ssh.authTypes.keyFile'), mode: 'keyfile' },
          { label: this.$t('connection.ssh.authTypes.userPass'), mode: "userpass" },
          { label: this.$t('connection.ssh.authTypes.agent'), mode: "agent" }
        ]
      }
    },
    methods: {
      setMode(option) {
        this.config.sshMode = option.mode
      }
    }
  }
</script>
