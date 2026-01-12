<template>
  <toggle-form-area
    :title="$t('SSH Tunnel')"
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
          <div>{{ $t('For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.') }}</div>
        </div>
      </div>
      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">{{ $t('SSH Hostname') }}</label>
          <masked-input
            :value="config.sshHost"
            :privacyMode="privacyMode"
            @input="val => config.sshHost = val"
          />
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">{{ $t('Port') }}</label>
          <masked-input
            :value="config.sshPort"
            :privacyMode="privacyMode"
            @input="val => config.sshPort = val"
          />
        </div>
      </div>
      <div class="row gutter">
        <div class="col s8 form-group">
          <label for="bastionHost">{{ $t('Bastion Host (Jump Host)') }}</label>
          <masked-input
            :value="config.sshBastionHost"
            :privacyMode="privacyMode"
            @input="val => config.sshBastionHost = val"
          />
        </div>
        <div class="col s4 form-group">
          <label for="sshKeepaliveInterval">
            {{ $t('Keepalive Interval') }} <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{ content: $t('Ping the server after this many seconds when idle <br /> to prevent getting disconnected due to inactiviy <br/> (like<code> ServerAliveInterval 60 </code>in ssh/config)'), html: true}"
            >help_outlined</i>
          </label>
          <input
            type="number"
            v-model.number="config.sshKeepaliveInterval"
            name="sshKeepaliveInterval"
            :placeholder="$t('(in seconds)')"
          >
        </div>
      </div>
      <div class="form-group">
        <label>{{ $t('SSH Authentication') }}</label>
        <select
          class="form-control"
          v-model="config.sshMode"
        >
          <option
            v-for="option in sshModeOptions"
            :key="option.mode"
            :value="option.mode"
          >
            {{ $t(option.label) }}
          </option>
        </select>
      </div>

      <div
        v-if="config.sshMode === 'agent'"
        class="agent flex-col"
      >
        <div class="form-group">
          <label for="sshUsername">{{ $t('SSH Username') }}</label>
          <masked-input
            :value="config.sshUsername"
            :privacyMode="privacyMode"
            @input="val => config.sshUsername = val"
          />
        </div>
        <div
          class="alert alert-warning"
          v-if="$config.isSnap"
        >
          <i class="material-icons">error_outline</i>
          <div>
            {{ $t('SSH Agent Forwarding is not possible with the Snap version of Beekeeper Studio due to the security model of Snap apps.') }}
            <external-link :href="enableSshLink">
              {{ $t('Read more') }}
            </external-link>
          </div>
        </div>
        <div
          v-else-if="$config.sshAuthSock"
          class="alert alert-success"
        >
          <i class="material-icons">check</i>
          <div>{{ $t('We found your SSH Agent. You\'re good to go!') }}</div>
        </div>
        <div
          v-else-if="$config.isWindows"
          class="alert alert-info"
        >
          <i class="material-icons-outlined">info</i>
          <div>{{ $t('We didn\'t find a *nix ssh-agent running, so we\'ll attempt to use the PuTTY agent, pageant.') }}</div>
        </div>
        <div
          v-else
          class="alert alert-warning"
        >
          <i class="material-icons">error_outline</i>
          <div>{{ $t('You don\'t seem to have an SSH agent running.') }}</div>
        </div>
      </div>

      <div
        v-if="config.sshMode === 'keyfile'"
        class="private-key gutter"
      >
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="sshUsername">{{ $t('SSH Username') }}</label>
              <masked-input
                :value="config.sshUsername"
                :privacyMode="privacyMode"
                @input="val => config.sshUsername = val"
              />
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
              {{ $t('Hey snap user! You need to') }} <external-link :href="enableSshLink">
                {{ $t('enable SSH access') }}
              </external-link>{{ $t(', then restart Beekeeper to provide access to your .ssh directory.') }}
            </div>
          </div>
        </div>
        <div class="row gutter">
          <div class="col s6 form-group">
            <label for="sshKeyfile">{{ $t('Private Key File') }}</label>
            <file-picker
              v-model="config.sshKeyfile"
              :show-hidden-files="true"
              :default-path="filePickerDefaultPath"
            />
          </div>
          <div class="col s6 form-group">
            <label for="sshKeyfilePassword">{{ $t('Key File PassPhrase') }} <span class="hint">{{ $t('(Optional)') }}</span></label>
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
            <label for="sshUsername">{{ $t('SSH Username') }}</label>
            <masked-input
              :value="config.sshUsername"
              :privacyMode="privacyMode"
              @input="val => config.sshUsername = val"
            />
          </div>
        </div>
        <div class="col s6">
          <div class="form-group">
            <label for="sshPassword">{{ $t('SSH Password') }}</label>
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
import MaskedInput from '@/components/MaskedInput.vue'
import { mapState } from 'vuex'

export default {
  props: ['config'],
  components: {
    FilePicker, ExternalLink,
    ToggleFormArea, MaskedInput
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
  },
  data() {
    return {
      enableSshLink: "https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap",
      sshModeOptions: [
        { label: "Key File", mode: 'keyfile' },
        { label: "Username & Password", mode: "userpass" },
        { label: "SSH Agent", mode: "agent" }
      ],
      filePickerDefaultPath: window.main.join(platformInfo.homeDirectory, '.ssh')
    }
  },
  methods: {
    setMode(option) {
      this.config.sshMode = option.mode
    }
  }
}
</script>
