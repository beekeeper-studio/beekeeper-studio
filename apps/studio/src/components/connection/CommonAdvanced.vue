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
      <div class="row gutter alert-row">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>
            <strong>Using <code>~/.ssh/config</code>:</strong>
            you can type a <code>Host</code> alias from your SSH config in any host field below.
            We'll resolve <code>HostName</code>, <code>Port</code>, <code>User</code>, <code>IdentityFile</code>, and <code>IdentitiesOnly</code> from your config.
            <br>
            <strong>Precedence (first match wins):</strong>
            <ol class="ssh-precedence">
              <li>Values you enter in the fields below.</li>
              <li>Matching entry in <code>~/.ssh/config</code>.</li>
              <li>SSH defaults (e.g. port 22, current OS user).</li>
            </ol>
          </div>
        </div>
      </div>

      <!-- Bastion -->

      <toggle-form-area
        title="Bastion Host (optional)"
        class="bastion-host"
      >
        <div class="row gutter">
          <div class="col s9 form-group">
            <label for="bastionHost">Bastion Host (Jump Host)</label>
            <masked-input
              :value="config.sshBastionHost"
              @input="val => config.sshBastionHost = val"
            />
            <small class="form-help">Hostname or <code>~/.ssh/config</code> Host alias.</small>
          </div>
          <div class="col s3 form-group">
            <label for="sshBastionHostPort">Port</label>
            <masked-input
              :value="config.sshBastionHostPort"
              @input="val => config.sshBastionHostPort = val"
            />
            <small class="form-help">Falls back to <code>Port</code> from <code>~/.ssh/config</code>, then 22.</small>
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
          <small
            class="form-help"
            v-html="modeHelpText(config.sshBastionMode)"
          />
        </div>

        <div
          v-if="config.sshBastionMode === 'agent'"
          class="agent flex-col"
        >
          <div class="form-group">
            <label>Bastion Username <span class="hint">(Optional)</span></label>
            <masked-input
              :value="config.sshBastionUsername"
              @input="val => config.sshBastionUsername = val"
            />
            <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>, then your OS username.</small>
          </div>
          <platform-warning location="ssh-agent" />
          <div
            v-if="$config.isWindows && !$config.sshAuthSock"
            class="alert alert-info"
          >
            <i class="material-icons-outlined">info</i>
            <div>We didn't find a *nix ssh-agent running, so we'll attempt to use the PuTTY agent, pageant.</div>
          </div>
          <div
            v-else-if="!$config.sshAuthSock && !$config.isWindows"
            class="alert alert-warning"
          >
            <i class="material-icons">error_outline</i>
            <div>You don't seem to have an SSH agent running.</div>
          </div>
        </div>

        <div
          v-if="config.sshBastionMode === 'keyfile'"
          class="private-key gutter"
        >
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label>Bastion Username <span class="hint">(Optional)</span></label>
                <masked-input
                  :value="config.sshBastionUsername"
                  @input="val => config.sshBastionUsername = val"
                />
                <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>.</small>
              </div>
            </div>
          </div>
          <div class="row gutter">
            <div class="col s6 form-group">
              <label>Private Key File <span class="hint">(Optional)</span></label>
              <file-picker
                v-model="config.sshBastionKeyfile"
                :show-hidden-files="true"
                :default-path="filePickerDefaultPath"
              />
              <small class="form-help">If blank, we use <code>IdentityFile</code> from <code>~/.ssh/config</code>.</small>
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
              <label>Bastion Username <span class="hint">(Optional)</span></label>
              <masked-input
                :value="config.sshBastionUsername"
                @input="val => config.sshBastionUsername = val"
              />
              <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>.</small>
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
          <label for="sshHost">SSH Hostname</label>
          <masked-input
            :value="config.sshHost"
            @input="val => config.sshHost = val"
          />
          <small class="form-help">Hostname or <code>~/.ssh/config</code> Host alias.</small>
        </div>
        <div class="col s3 form-group">
          <label for="sshPort">Port</label>
          <masked-input
            :value="config.sshPort"
            @input="val => config.sshPort = val"
          />
          <small class="form-help">Falls back to <code>Port</code> from <code>~/.ssh/config</code>, then 22.</small>
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
        <small
          class="form-help"
          v-html="modeHelpText(config.sshMode)"
        />
      </div>

      <div
        v-if="config.sshMode === 'agent'"
        class="agent flex-col"
      >
        <div class="form-group">
          <label for="sshUsername">SSH Username <span class="hint">(Optional)</span></label>
          <masked-input
            :value="config.sshUsername"
            @input="val => config.sshUsername = val"
          />
          <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>, then your OS username.</small>
        </div>
        <platform-warning location="ssh-agent" />
        <div
          v-if="$config.isWindows && !$config.sshAuthSock"
          class="alert alert-info"
        >
          <i class="material-icons-outlined">info</i>
          <div>We didn't find a *nix ssh-agent running, so we'll attempt to use the PuTTY agent, pageant.</div>
        </div>
        <div
          v-else-if="!$config.sshAuthSock && !$config.isWindows"
          class="alert alert-warning"
        >
          <i class="material-icons">error_outline</i>
          <div>You don't seem to have an SSH agent running.</div>
        </div>
      </div>

      <div
        v-if="config.sshMode === 'keyfile'"
        class="private-key gutter"
      >
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="sshUsername">SSH Username <span class="hint">(Optional)</span></label>
              <masked-input
                :value="config.sshUsername"
                @input="val => config.sshUsername = val"
              />
              <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>.</small>
            </div>
          </div>
        </div>
        <platform-warning location="ssh-keyfile" />
        <div class="row gutter">
          <div class="col s6 form-group">
            <label for="sshKeyfile">Private Key File <span class="hint">(Optional)</span></label>
            <file-picker
              v-model="config.sshKeyfile"
              :show-hidden-files="true"
              :default-path="filePickerDefaultPath"
            />
            <small class="form-help">If blank, we use <code>IdentityFile</code> from <code>~/.ssh/config</code>.</small>
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
            <label for="sshUsername">SSH Username <span class="hint">(Optional)</span></label>
            <masked-input
              :value="config.sshUsername"
              @input="val => config.sshUsername = val"
            />
            <small class="form-help">If blank, we use <code>User</code> from <code>~/.ssh/config</code>.</small>
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

export default {
  props: ['config'],
  components: {
    FilePicker, ExternalLink,
    ToggleFormArea, MaskedInput,
    PlatformWarning
  },
  data() {
    return {
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
    },
    modeHelpText(mode) {
      switch (mode) {
        case 'agent':
          return "Tries your SSH agent first, then any <code>IdentityFile</code> from <code>~/.ssh/config</code> as fallback (matching <code>ssh</code>). With <code>IdentitiesOnly yes</code> set in <code>~/.ssh/config</code>, the agent only offers identities that match your <code>IdentityFile</code>."
        case 'keyfile':
          return "Authenticates with the private key file you've selected. Falls back to <code>IdentityFile</code> from <code>~/.ssh/config</code> if you leave the picker empty."
        case 'userpass':
          return 'Authenticates with the username and password entered above.'
        default:
          return ''
      }
    }
  }
}
</script>

<style scoped>
.alert-row {
  margin-inline: 0;
}
.form-help {
  display: block;
  margin-top: 0.25rem;
  opacity: 0.7;
  font-size: 0.85em;
}
.form-help code {
  font-size: 0.95em;
}
.ssh-precedence {
  margin: 0.4rem 0 0;
  padding-inline-start: 1.25rem;
}
.ssh-precedence li {
  margin-bottom: 0.1rem;
}
</style>
