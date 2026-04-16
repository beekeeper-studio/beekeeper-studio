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

      <ssh-jump-hosts
        :ssh-configs="sshConfigs"
        v-bind:selected-position.sync="selectedPosition"
        @add="onAdd"
        @remove="onRemove"
        @reorder="onReorder"
      />

      <div
        class="connection-host"
        v-show="sshConfigs.length > 0"
      >
        <div class="icon-container">
          <i class="material-icons-outlined link-icon">link</i>
        </div>
        <div
          class="form-group"
          title="The database connection that the SSH tunnel will forward to"
        >
          <!-- <label class="label" for="connection-host-placeholder">Target Connection</label> -->
          <div class="input-wrapper">
            <input
              type="text"
              disabled
              id="connection-host-placeholder"
              :value="$bks.simpleConnectionString(config)"
            >
            <button class="btn btn-fab" type="button" @click="focusHostInput">
              <i class="material-icons">create</i>
            </button>
          </div>
          <div class="hint">
            Your database connection, reached through the SSH tunnel above
          </div>
        </div>
      </div>
      <!-- Edit form for the selected row -->
      <template v-if="selectedConfig">
        <div class="row gutter">
          <div class="col s9 form-group">
            <label>Hostname</label>
            <input
              type="text"
              class="form-control"
              :value="selectedConfig.host"
              @input="updateSelectedSsh('host', $event.target.value)"
            />
          </div>
          <div class="col s3 form-group">
            <label>Port</label>
            <input
              type="number"
              class="form-control"
              :value="selectedConfig.port"
              @input="updateSelectedSsh('port', $event.target.value)"
            />
          </div>
        </div>
        <div class="form-group">
          <label>Authentication</label>
          <select
            class="form-control"
            :value="selectedConfig.mode"
            @change="updateSelectedSsh('mode', $event.target.value)"
          >
            <option
              v-for="option in sshModeOptions"
              :key="option.mode"
              :value="option.mode"
            >
              {{ option.label }}
            </option>
          </select>
          <div class="ssh-agent-indicator" v-if="selectedConfig.mode === 'agent'">
            <template v-if="agentStatus.ok && !agentStatus.warning" />
            <div
              v-else-if="agentStatus.warning === 'win-nix-agent-not-found'"
              class="info"
            >
              <i class="material-icons-outlined">info</i>
              <div>
                We didn't find a *nix ssh-agent running, so we'll attempt to use
                the PuTTY agent, pageant.
              </div>
            </div>
            <div
              v-else-if="agentStatus.warning === 'unsupported-snap'"
              class="error"
            >
              <i class="material-icons">error_outline</i>
              <div>
                SSH Agent Forwarding is not possible with the Snap version of
                Beekeeper Studio due to the security model of Snap apps.
                <external-link :href="enableSshLink">Read more</external-link>
              </div>
            </div>
            <div v-else class="warning">
              <i class="material-icons">error_outline</i>
              <div>You don't seem to have an SSH agent running.</div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Username</label>
          <masked-input
            :value="selectedConfig.username"
            :privacyMode="privacyMode"
            @input="updateSelectedSsh('username', $event)"
          />
        </div>
        <div v-if="selectedConfig.mode === 'keyfile'" class="private-key gutter">
          <div v-if="$config.isSnap && !$config.snapSshPlug" class="row">
            <div class="alert alert-warning">
              <i class="material-icons">error_outline</i>
              <div>
                Hey snap user! You need to
                <external-link :href="enableSshLink"
                  >enable SSH access</external-link
                >, then restart Beekeeper to provide access to your .ssh
                directory.
              </div>
            </div>
          </div>
          <div class="row form-group">
            <label>Private Key File</label>
            <file-picker
              :value="selectedConfig.keyfile"
              editable
              :show-hidden-files="true"
              :default-path="filePickerDefaultPath"
              @input="updateSelectedSsh('keyfile', $event)"
            />
          </div>
          <div class="row form-group">
            <label>Key Passphrase <span class="hint">(Optional)</span></label>
            <input
              type="password"
              class="form-control"
              :value="selectedConfig.keyfilePassword"
              @input="updateSelectedSsh('keyfilePassword', $event.target.value)"
            />
          </div>
        </div>
        <div v-if="selectedConfig.mode === 'userpass'" class="form-group">
          <label>Password</label>
          <input
            type="password"
            class="form-control"
            :value="selectedConfig.password"
            @input="updateSelectedSsh('password', $event.target.value)"
          />
        </div>
      </template>

      <details class="advanced-settings">
        <summary><h5>Advanced settings</h5></summary>
        <div class="row form-group">
          <label for="sshKeepaliveInterval">
            Keepalive Interval
            <i
              class="material-icons"
              style="padding-left: 0.25rem"
              v-tooltip="{
                content:
                  'Ping the server after this many seconds when idle <br /> to prevent getting disconnected due to inactiviy <br/> (like<code> ServerAliveInterval 60 </code>in ssh/config)',
                html: true,
              }"
              >help_outlined</i
            >
          </label>
          <input
            type="number"
            v-model.number="config.sshKeepaliveInterval"
            name="sshKeepaliveInterval"
            placeholder="(in seconds)"
          />
        </div>
      </details>
    </template>
  </toggle-form-area>
</template>

<script lang="ts">
import ToggleFormArea from '../common/ToggleFormArea.vue'
import { mapGetters } from 'vuex'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'
import _ from 'lodash'
import MaskedInput from '@/components/MaskedInput.vue'
import { TransportSshConfig } from "@/common/transport/TransportSshConfig";
import Vue, { PropType } from 'vue'
import { IConnection } from '@/common/interfaces/IConnection'
import { AppEvent } from '@/common/AppEvent'

export default Vue.extend({
  props: {
    config: {
      type: Object as PropType<Partial<IConnection>>,
      required: true,
    },
  },
  components: {
    ToggleFormArea,
    SshJumpHosts,
    MaskedInput,
  },
  data() {
    return {
      selectedPosition: this.config.sshConfigs?.[0]?.position ?? -1,
    }
  },
  computed: {
    ...mapGetters('settings', ['privacyMode'] as const),
    sshConfigs() {
      return this.config.sshConfigs ?? [];
    },
    selectedConfig(): TransportSshConfig | null {
      const join = this.sshConfigs.find(
        (j) => j.position === this.selectedPosition
      );
      return join?.sshConfig ?? null;
    },
    sshModeOptions() {
      return [
        { label: "Key File", mode: "keyfile" },
        { label: "Username & Password", mode: "userpass" },
        { label: "SSH Agent", mode: "agent" },
      ];
    },
    agentStatus() {
      if (this.$config.isSnap) {
        return { ok: false, warning: "unsupported-snap" } as const;
      }
      if (this.$config.sshAuthSock) {
        return { ok: true } as const;
      }
      if (this.$config.isWindows) {
        return { ok: true, warning: "win-nix-agent-not-found" } as const;
      }
      return { ok: false, warning: "ssh-agent-not-running" } as const;
    },
    enableSshLink(): string {
      return "https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap";
    },
    filePickerDefaultPath(): string {
      return window.main.join(window.platformInfo.homeDirectory, ".ssh");
    },
  },
  methods: {
    onAdd() {
      const sshConfigs = [...this.sshConfigs]
      const position = sshConfigs.length
      sshConfigs.push({
        connectionId: this.config.id ?? null,
        position,
        sshConfig: {
          host: '',
          port: 22,
          mode: 'agent',
          username: '',
        },
      })
      this.$set(this.config, 'sshConfigs', sshConfigs)
      this.selectedPosition = position
    },
    onRemove(position) {
      const filteredConfigs = this.sshConfigs.filter((j) =>
        j.position !== position
      )
      let counter = 0
      const sshConfigs = _.cloneWith(filteredConfigs, (value, key) => {
        if (key === 'position') {
          return counter++
        }
        return value
      })
      this.$set(this.config, 'sshConfigs', sshConfigs)
    },
    onReorder({ oldIndex, newIndex }) {
      const reordered = _.cloneDeep(this.sshConfigs)

      const [moved] = reordered.splice(oldIndex, 1)

      reordered.splice(newIndex, 0, moved)

      for (let i = 0; i < reordered.length; i++) {
        reordered[i].position = i;
      }

      this.$set(this.config, 'sshConfigs', reordered)
    },
    updateSelectedSsh(field, value) {
      const sshConfigs = _.cloneDeep(this.sshConfigs)
      const join = sshConfigs.find((j) => j.position === this.selectedPosition)
      if (join) {
        join.sshConfig[field] = value
      }
      this.$set(this.config, 'sshConfigs', sshConfigs)
    },
    focusHostInput() {
      this.trigger(AppEvent.focusConnectionHost);
    },
  },
});
</script>

<style scoped>
.separator {
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
  margin-bottom: 0.25rem;
}
.alert-row {
  margin-inline: 0;
}

.connection-host {
  margin-top: 0.5rem;
  display: flex;

  .icon-container {
    width: 1.5rem;
  }

  .link-icon {
    font-size: 1em;
    color: var(--text-lighter);
    font-weight: 600;
    margin-top: 0.4rem;
    margin-left: -0.17rem;
  }

  .form-group {
    padding-top: 0;
    width: 100%;
  }

  .input-wrapper {
    position: relative;
    display: flex;

    input {
      font-weight: 600;
    }

    .btn {
      position: absolute;
      right: 0px;
      top: 50%;
      transform: translateY(-50%);
      margin-block: 0;
      height: 1.6rem;
      width: 1.6rem;
      min-width: 1.6rem;

      &:not(:hover) {
        background-color: transparent;
      }

      .material-icons {
        font-size: 1em;
      }
    }
  }
}

.ssh-agent-indicator > div {
  display: flex;
  font-size: 0.76em;
  gap: 0.4em;
  padding-top: 0.5em;

  .material-icons,
  .material-icons-outlined {
    font-size: 1.17em;
    line-height: 0.9;
  }

  &.error {
    color: var(--brand-danger);
  }

  &.info {
    color: var(--brand-info);
  }

  &.warning {
    color: var(--brand-warning);
  }
}

summary h5 {
  margin-bottom: 0.25rem;
  padding-left: 0.5em;
  display: inline-block;
}
</style>
