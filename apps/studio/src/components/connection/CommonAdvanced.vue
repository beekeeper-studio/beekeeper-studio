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
            Type a <code>Host</code> alias from your <code>~/.ssh/config</code> in any host field below and we'll resolve the <code>HostName</code>, <code>Port</code>, and <code>User</code>. Anything you enter in the form takes precedence.
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
        </div>

        <div
          v-if="config.sshBastionMode === 'auto'"
          class="agent flex-col"
        >
          <div class="alert alert-info auto-alert">
            <i class="material-icons-outlined">info</i>
            <div>
              <div>Tries your SSH agent, then your <code>~/.ssh/config</code> <code>IdentityFile</code>, then a default key like <code>~/.ssh/id_ed25519</code>.</div>
              <details class="auto-details">
                <summary>How it works</summary>
                <ol class="auto-order">
                  <li><strong>SSH agent.</strong> Whatever your <code>SSH_AUTH_SOCK</code> (or PuTTY's pageant on Windows) is advertising. Honors <code>IdentitiesOnly yes</code>.</li>
                  <li><strong><code>IdentityFile</code> from <code>~/.ssh/config</code>.</strong> Used if the matching <code>Host</code> entry has one.</li>
                  <li><strong>Default key.</strong> The first of <code>~/.ssh/id_ed25519</code>, <code>id_ecdsa</code>, <code>id_rsa</code>, or <code>id_dsa</code> that exists.</li>
                </ol>
              </details>
            </div>
          </div>
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
      </div>

      <div
        v-if="config.sshMode === 'auto'"
        class="agent flex-col"
      >
        <div class="alert alert-info auto-alert">
          <i class="material-icons-outlined">info</i>
          <div>
            <div>Tries your SSH agent, then your <code>~/.ssh/config</code> <code>IdentityFile</code>, then a default key like <code>~/.ssh/id_ed25519</code>.</div>
            <details class="auto-details">
              <summary>How it works</summary>
              <ol class="auto-order">
                <li><strong>SSH agent.</strong> Whatever your <code>SSH_AUTH_SOCK</code> (or PuTTY's pageant on Windows) is advertising. Honors <code>IdentitiesOnly yes</code>.</li>
                <li><strong><code>IdentityFile</code> from <code>~/.ssh/config</code>.</strong> Used if the matching <code>Host</code> entry has one.</li>
                <li><strong>Default key.</strong> The first of <code>~/.ssh/id_ed25519</code>, <code>id_ecdsa</code>, <code>id_rsa</code>, or <code>id_dsa</code> that exists.</li>
              </ol>
            </details>
          </div>
        </div>
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
        { label: "Automatic", mode: "auto" },
        { label: "Key File", mode: 'keyfile' },
        { label: "Username & Password", mode: "userpass" },
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
.auto-alert {
  margin-bottom: 0.75rem;
}
.auto-details {
  margin-top: 0.5rem;
}
.auto-details > summary {
  cursor: pointer;
  opacity: 0.85;
}
.auto-order {
  margin: 0.4rem 0 0;
  padding-inline-start: 1.25rem;
}
.auto-order li {
  margin-bottom: 0.25rem;
}
</style>
