<template>
  <toggle-form-area
    title="SSH Tunnel"
    :expanded="config.sshEnabled"
  >
    <template v-slot:header>
      <x-switch
        @click.prevent="config.sshEnabled = !config.sshEnabled"
        :toggled="config.sshEnabled"
      />
    </template>
    <template>
      <div class="row gutter alert-row">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.</div>
        </div>
      </div>

      <!-- Bastion -->

      <toggle-form-area
        title="Bastion Host (optional)"
        class="bastion-host"
      >
        <div class="row gutter">
          <div class="col s9 form-group">
            <label for="bastionHost">
              Bastion Host (Jump Host)
              <i
                class="material-icons help-icon"
                v-tooltip="{ content: hostTooltip, html: true }"
              >help_outlined</i>
            </label>
            <masked-input
              :value="config.sshBastionHost"
              @input="val => config.sshBastionHost = val"
            />
          </div>
          <div class="col s3 form-group">
            <label for="sshBastionHostPort">Port <span class="hint">(Optional)</span></label>
            <masked-input
              :value="config.sshBastionHostPort"
              @input="val => config.sshBastionHostPort = val"
              placeholder="22"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Bastion Host Authentication</label>
          <select
            class="form-control"
            v-model="config.sshBastionMode"
          >
            <option
              v-for="option in sshModeOptions"
              :key="option.mode"
              :value="option.mode"
            >
              {{ option.label }}
            </option>
          </select>
          <auto-mode-status
            v-if="config.sshBastionMode === 'agent'"
            :ssh-auth-sock="$config.sshAuthSock"
            :is-windows="$config.isWindows"
            :ssh-config-exists="$config.sshConfigExists"
            :ssh-config-path="sshConfigPath"
            :default-ssh-identity-file="$config.defaultSshIdentityFile"
            :home-directory="homeDirectory"
          />
        </div>

        <div
          v-if="config.sshBastionMode === 'agent'"
          class="agent flex-col"
        >
          <div class="form-group">
            <label>
              Bastion Username <span class="hint">(Optional)</span>
              <i
                class="material-icons help-icon"
                v-tooltip="{ content: usernameTooltip, html: true }"
              >help_outlined</i>
            </label>
            <masked-input
              :value="config.sshBastionUsername"
              @input="val => config.sshBastionUsername = val"
            />
          </div>
          <platform-warning location="ssh-agent" />
        </div>

        <div
          v-if="config.sshBastionMode === 'keyfile'"
          class="private-key gutter"
        >
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label>
                  Bastion Username <span class="hint">(Optional)</span>
                  <i
                    class="material-icons help-icon"
                    v-tooltip="{ content: usernameTooltip, html: true }"
                  >help_outlined</i>
                </label>
                <masked-input
                  :value="config.sshBastionUsername"
                  @input="val => config.sshBastionUsername = val"
                />
              </div>
            </div>
          </div>
          <div class="row gutter">
            <div class="col s6 form-group">
              <label>Private Key File</label>
              <file-picker
                v-model="config.sshBastionKeyfile"
                :show-hidden-files="true"
                :default-path="filePickerDefaultPath"
              />
            </div>
            <div class="col s6 form-group">
              <label>Key File PassPhrase <span class="hint">(Optional)</span></label>
              <input
                type="password"
                class="form-control"
                v-model="config.sshBastionKeyfilePassword"
              >
            </div>
          </div>
        </div>

        <div
          v-if="config.sshBastionMode === 'userpass'"
          class="row gutter"
        >
          <div class="col s6">
            <div class="form-group">
              <label>
                Bastion Username <span class="hint">(Optional)</span>
                <i
                  class="material-icons help-icon"
                  v-tooltip="{ content: usernameTooltip, html: true }"
                >help_outlined</i>
              </label>
              <masked-input
                :value="config.sshBastionUsername"
                @input="val => config.sshBastionUsername = val"
              />
            </div>
          </div>
          <div class="col s6">
            <div class="form-group">
              <label>Bastion Password</label>
              <input
                class="form-control"
                type="password"
                v-model="config.sshBastionPassword"
              >
            </div>
          </div>
        </div>
      </toggle-form-area>

      <!-- Target Host -->

      <div class="row gutter">
        <div class="col s9 form-group">
          <label for="sshHost">
            SSH Hostname
            <i
              class="material-icons help-icon"
              v-tooltip="{ content: hostTooltip, html: true }"
            >help_outlined</i>
          </label>
          <masked-input
            :value="config.sshHost"
            @input="val => config.sshHost = val"
          />
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">Port <span class="hint">(Optional)</span></label>
          <masked-input
            :value="config.sshPort"
            @input="val => config.sshPort = val"
            placeholder="22"
          />
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
        <auto-mode-status
          v-if="config.sshMode === 'agent'"
          :ssh-auth-sock="$config.sshAuthSock"
          :is-windows="$config.isWindows"
          :ssh-config-exists="$config.sshConfigExists"
          :ssh-config-path="sshConfigPath"
          :default-ssh-identity-file="$config.defaultSshIdentityFile"
          :home-directory="homeDirectory"
        />
      </div>

      <div
        v-if="config.sshMode === 'agent'"
        class="agent flex-col"
      >
        <div class="form-group">
          <label for="sshUsername">
            SSH Username <span class="hint">(Optional)</span>
            <i
              class="material-icons help-icon"
              v-tooltip="{ content: usernameTooltip, html: true }"
            >help_outlined</i>
          </label>
          <masked-input
            :value="config.sshUsername"
            @input="val => config.sshUsername = val"
          />
        </div>
        <platform-warning location="ssh-agent" />
      </div>

      <div
        v-if="config.sshMode === 'keyfile'"
        class="private-key gutter"
      >
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="sshUsername">
                SSH Username <span class="hint">(Optional)</span>
                <i
                  class="material-icons help-icon"
                  v-tooltip="{ content: usernameTooltip, html: true }"
                >help_outlined</i>
              </label>
              <masked-input
                :value="config.sshUsername"
                @input="val => config.sshUsername = val"
              />
            </div>
          </div>
        </div>
        <platform-warning location="ssh-keyfile" />
        <div class="row gutter">
          <div class="col s6 form-group">
            <label for="sshKeyfile">Private Key File</label>
            <file-picker
              v-model="config.sshKeyfile"
              :show-hidden-files="true"
              :default-path="filePickerDefaultPath"
            />
          </div>
          <div class="col s6 form-group">
            <label for="sshKeyfilePassword">Key File PassPhrase <span class="hint">(Optional)</span></label>
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
            <label for="sshUsername">
              SSH Username <span class="hint">(Optional)</span>
              <i
                class="material-icons help-icon"
                v-tooltip="{ content: usernameTooltip, html: true }"
              >help_outlined</i>
            </label>
            <masked-input
              :value="config.sshUsername"
              @input="val => config.sshUsername = val"
            />
          </div>
        </div>
        <div class="col s6">
          <div class="form-group">
            <label for="sshPassword">SSH Password</label>
            <input
              class="form-control"
              type="password"
              v-model="config.sshPassword"
            >
          </div>
        </div>
      </div>

      <div class="row gutter">
        <div class="col form-group">
          <label for="sshKeepaliveInterval">
            Keepalive Interval <i
              class="material-icons"
              style="padding-left: 0.25rem"
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
    </template>
  </toggle-form-area>
</template>
<script>
import FilePicker from '@/components/common/form/FilePicker.vue'
import ExternalLink from '@/components/common/ExternalLink.vue'
import ToggleFormArea from '../common/ToggleFormArea.vue'
import MaskedInput from '@/components/MaskedInput.vue'
import PlatformWarning from './PlatformWarning.vue'
import AutoModeStatus from './AutoModeStatus.vue'

export default {
  props: ['config'],
  components: {
    FilePicker, ExternalLink,
    ToggleFormArea, MaskedInput,
    PlatformWarning, AutoModeStatus
  },
  data() {
    return {
      sshModeOptions: [
        { label: "Automatic", mode: "agent" },
        { label: "Key File", mode: 'keyfile' },
        { label: "Username & Password", mode: "userpass" },
      ],
      filePickerDefaultPath: window.main.join(platformInfo.homeDirectory, '.ssh'),
      sshConfigPath: window.main.join(platformInfo.homeDirectory, '.ssh', 'config'),
      homeDirectory: platformInfo.homeDirectory,
      hostTooltip: "Hostname or IP. A <code>Host</code> alias from <code>~/.ssh/config</code> resolves to <code>HostName</code>, <code>Port</code>, and <code>User</code> from the matching entry.",
      usernameTooltip: "If blank, falls back to <code>User</code> from <code>~/.ssh/config</code>, then your OS username.",
    }
  },
  methods: {
    setMode(option) {
      this.config.sshMode = option.mode
    }
  }
}
</script>

<style scoped>
.help-icon {
  font-size: 14px;
  padding-left: 0.25rem;
  opacity: 0.6;
  vertical-align: middle;
}
</style>
