<template>
  <toggle-form-area
    title="SSH Tunnel"
    @toggleContent="toggleContent = $event"
    :expanded="true"
    :initially-expanded="true"
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
          <div>For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.</div>
        </div>
      </div>

      <ssh-jump-hosts-table v-if="toggleContent" :rows="rows" />

      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">SSH Hostname</label>
          <masked-input
            :value="config.sshHost"
            :privacyMode="privacyMode"
            @input="val => config.sshHost = val"
          />
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">Port</label>
          <masked-input
            :value="config.sshPort"
            :privacyMode="privacyMode"
            @input="val => config.sshPort = val"
          />
        </div>
      </div>
      <div class="row">
        <div class="col form-group">
          <label for="sshKeepaliveInterval">
            Keepalive Interval <i
              class="material-icons"
              v-tooltip="{ content: 'Ping the server after this many seconds when idle <br /> to prevent getting disconnected due to inactiviy <br/> (like<code> ServerAliveInterval 60 </code>in ssh/config)', html: true}"
            >help_outlined</i>
          </label>
          <input
            type="number"
            v-model.number="config.sshKeepaliveInterval"
            name="sshKeepaliveInterval"
            placeholder="(in seconds)"
          >
        </div>
      </div>
      <div class="form-group">
        <label>SSH Authentication</label>
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
        <div class="ssh-agent-indicator" v-if="config.sshMode === 'agent'">
          <div
            class="error"
            v-if="$config.isSnap"
          >
            <i class="material-icons">error_outline</i>
            <div>
              SSH Agent Forwarding is not possible with the Snap version of Beekeeper Studio due to the security model of Snap apps.
              <external-link :href="enableSshLink">
                Read more
              </external-link>
            </div>
          </div>
          <div
            v-else-if="$config.sshAuthSock"
            class="success"
          >
            <i class="material-icons">check</i>
            <div>We found your SSH Agent. You're good to go!</div>
          </div>
          <div
            v-else-if="$config.isWindows"
            class="info"
          >
            <i class="material-icons-outlined">info</i>
            <div>We didn't find a *nix ssh-agent running, so we'll attempt to use the PuTTY agent, pageant.</div>
          </div>
          <div
            v-else
            class="warning"
          >
            <i class="material-icons">error_outline</i>
            <div>You don't seem to have an SSH agent running.</div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="sshUsername">SSH Username</label>
        <masked-input
          :value="config.sshUsername"
          :privacyMode="privacyMode"
          @input="val => config.sshUsername = val"
        />
      </div>

      <div
        v-if="config.sshMode === 'keyfile'"
        class="private-key gutter"
      >
        <div
          v-if="$config.isSnap && !$config.snapSshPlug"
          class="row"
        >
          <div class="alert alert-warning">
            <i class="material-icons">error_outline</i>
            <div>
              Hey snap user! You need to <external-link :href="enableSshLink">
                enable SSH access
              </external-link>, then restart Beekeeper to provide access to your .ssh directory.
            </div>
          </div>
        </div>
        <div class="row form-group">
          <label for="sshKeyfile">Private Key File</label>
          <file-picker
            v-model="config.sshKeyfile"
            editable
            :show-hidden-files="true"
            :default-path="filePickerDefaultPath"
          />
        </div>
        <div class="row form-group">
          <label for="sshKeyfilePassword">Key File PassPhrase <span class="hint">(Optional)</span></label>
          <input
            type="password"
            class="form-control"
            v-model="config.sshKeyfilePassword"
          >
        </div>
      </div>
      <div
        v-if="config.sshMode === 'userpass'"
        class="form-group"
      >
        <label for="sshPassword">SSH Password</label>
        <input
          class="form-control"
          type="password"
          v-model="config.sshPassword"
        >
      </div>

      <div class="row gutter" v-if="false">
        <div class="col s9 form-group">
          <label for="bastionHost">Bastion Host (Jump Host)</label>
          <masked-input
            :value="config.sshBastionHost"
            :privacyMode="privacyMode"
            @input="val => config.sshBastionHost = val"
          />
        </div>
        <div class="col s3 form-group">
          <label for="bastionHost">Port</label>
          <masked-input
            :value="config.sshBastionPort"
            :privacyMode="privacyMode"
            @input="val => config.sshBastionPort = val"
          />
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
import SshJumpHostsTable from '@/components/connection/SshJumpHostsTable.vue'

export default {
  props: ['config'],
  components: {
    FilePicker, ExternalLink,
    ToggleFormArea, MaskedInput,
    SshJumpHostsTable,
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
      filePickerDefaultPath: window.main.join(platformInfo.homeDirectory, '.ssh'),
      toggleContent: false,
    }
  },
  computed: {
    rows() {
      return [
        {
          host: `${this.config.sshHost ?? ''}:${this.config.sshPort ?? ''}`,
          username: this.config.sshUsername ?? '',
          auth: this.config.sshMode ?? '',
        },
        { host: "localhost:3601", username: "azmy60", auth: "Password" },
        { host: "localhost:3601", username: "azmy60", auth: "Key File" },
      ];
    },
  },
  methods: {
    setMode(option) {
      this.config.sshMode = option.mode
    }
  }
}
</script>

<style scoped lang="scss">
.ssh-agent-indicator > div {
  display: flex;
  font-size: 0.76em;
  gap: 0.4em;
  padding-top: 0.5em;

  .material-icons, .material-icons-outlined {
    font-size: 1.17em;
    line-height: 0.9;
  }

  &.success {
    color: var(--brand-success);
  }

  &.info {
    color: var(--brand-info);
  }

  &.warning {
    color: var(--brand-warning);
  }
}

</style>
