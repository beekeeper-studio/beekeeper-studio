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
        <button
          class="btn connection-string"
          type="button" @click="focusHostInput"
          v-tooltip="`Your database connection, reached through the SSH tunnel above`"
        >
          {{ $bks.simpleConnectionString(config) }}
        </button>
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
          <div class="hint">
            <auto-mode-status
              v-if="selectedConfig.mode === 'agent'"
              :ssh-auth-sock="$config.sshAuthSock"
              :is-windows="$config.isWindows"
              :ssh-config-exists="$config.sshConfigExists"
              :ssh-config-path="$config.sshDirectory"
              :default-ssh-identity-file="$config.defaultSshIdentityFile"
              :home-directory="$config.homeDirectory"
            />
          </div>
          <div class="ssh-agent-indicator" v-if="selectedConfig.mode === 'agent'">
            <platform-warning location="ssh-agent" />
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
          <platform-warning location="ssh-keyfile" />
          <div class="row form-group">
            <label>Private Key File</label>
            <file-picker
              :value="selectedConfig.keyfile"
              editable
              :show-hidden-files="true"
              :default-path="$config.sshDirectory"
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
        <div class="row form-group">
          <label
            class="checkbox-group"
            for="sshStoreKeyfilePassword"
          >
            <input
              class="form-control"
              id="sshStoreKeyfilePassword"
              type="checkbox"
              name="sshStoreKeyfilePassword"
              v-model="config.sshStoreKeyfilePassword"
            >
            <span>Store Keyfile Password</span>
          </label>
        </div>
      </details>
    </template>
  </toggle-form-area>
</template>

<script lang="ts">
import FilePicker from '@/components/common/form/FilePicker.vue'
import ExternalLink from '@/components/common/ExternalLink.vue'
import ToggleFormArea from '../common/ToggleFormArea.vue'
import MaskedInput from '@/components/MaskedInput.vue'
import PlatformWarning from './PlatformWarning.vue'
import AutoModeStatus from './AutoModeStatus.vue'
import { mapGetters } from 'vuex'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'
import _ from 'lodash'
import { TransportConnectionSshConfig, TransportSshConfig } from "@/common/transport/TransportSshConfig";
import Vue, { PropType } from 'vue'
import { IConnection } from '@/common/interfaces/IConnection'
import { AppEvent } from '@/common/AppEvent'
import rawLog from '@bksLogger'

const log = rawLog.scope('CommonAdvanced.vue');

export default Vue.extend({
  props: {
    config: {
      type: Object as PropType<Partial<IConnection>>,
      required: true,
    },
  },
  components: {
    FilePicker, ExternalLink,
    ToggleFormArea, MaskedInput,
    PlatformWarning, AutoModeStatus,
    SshJumpHosts,
  },
  data() {
    return {
      sshModeOptions: [
        { label: "Automatic", mode: "agent" },
        { label: "Key File", mode: 'keyfile' },
        { label: "Username & Password", mode: "userpass" },
      ],
      selectedPosition: this.config.sshConfigs?.[0]?.position ?? -1,
    }
  },
  computed: {
    ...mapGetters('settings', ['privacyMode'] as const),
    sshConfigs(): TransportConnectionSshConfig[] {
      return this.config.sshConfigs ?? [];
    },
    selectedConfig(): TransportSshConfig | null {
      return this.sshConfigs.find(
        (join) => join.position === this.selectedPosition
      )?.sshConfig ?? null;
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
  },
  methods: {
    onAdd() {
      const lastPosition = this.sshConfigs.reduce(
        (max, join) => Math.max(max, join.position),
        -1
      )
      const position = lastPosition + 1
      this.$set(this.config, 'sshConfigs', [
        ...this.sshConfigs,
        {
          connectionId: this.config.id ?? null,
          position,
          sshConfig: { host: '', mode: 'agent', username: '' },
        },
      ])
      this.selectedPosition = position
    },
    onRemove(position) {
      const remaining = this.sshConfigs.filter(
        (join) => join.position !== position
      )
      let counter = 0
      const updated = _.cloneWith(remaining, (value, key) => {
        if (key === 'position') {
          return counter++
        }
        return value
      })
      this.$set(this.config, 'sshConfigs', updated)
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
    updateSelectedSsh(field: string, value: any) {
      const index = this.sshConfigs.findIndex(
        (join) => join.position === this.selectedPosition
      );
      if (index === -1) {
        log.error(`No SSH config found at position ${this.selectedPosition}`);
        return;
      }
      const updated = [...this.sshConfigs];
      updated[index] = _.cloneDeep(updated[index]);
      updated[index].sshConfig[field] = value;
      this.$set(this.config, 'sshConfigs', updated);
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
  margin-block: 0.1rem;
  display: flex;
  font-size: 0.831rem;

  .icon-container {
    width: 1.5rem;
    min-width: 1.5rem;
    padding-left: 0.05rem;
  }

  .link-icon {
    font-size: 1em;
    color: var(--text-lighter);
    font-weight: 600;
    margin-top: 0.4rem;
    margin-left: -0.17rem;
  }

  .connection-string {
    min-width: 0;
    border-radius: 5px;
    border: 1px dashed rgb(from var(--theme-base) r g b / 10%);
    color: var(--text-lighter);
    background-color: transparent;
    display: inline-block;
    text-overflow: ellipsis;
    overflow: hidden;
    padding-inline: 0.5rem;
    line-height: normal;
    font-weight: 500;

    &:hover, &:focus {
      background-color: rgb(from var(--theme-base) r g b / 5%);
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
