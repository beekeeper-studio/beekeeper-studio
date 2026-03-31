<template>
  <div>
    <div class="ssh-table-container">
      <div class="ssh-orders">
        <div
          v-for="(join, idx) in sortedConfigs"
          :key="join.position"
          class="host-bullet"
          :title="
            idx === sortedConfigs.length - 1
              ? 'Target Host'
              : `Jump Host #${idx + 1}`
          "
        />
        <div class="add-host-bullet">
          <i class="material-icons">add_circle</i>
        </div>
      </div>

      <div class="ssh-list-wrap">
        <div class="ssh-list-header">
          <span class="col-host">Host</span>
          <span class="col-username">Username</span>
          <span class="col-auth">Auth</span>
          <span class="col-action" />
        </div>

        <draggable
          :value="sortedConfigs"
          handle=".drag-handle"
          @end="onDragEnd"
        >
          <div
            v-for="row in rows"
            :key="row.position"
            class="ssh-row"
            :class="{ selected: selectedPosition === row.position }"
            @click="$emit('select', row.position)"
          >
            <span class="drag-handle" />
            <span class="col-host">
              <span class="host" v-text="row.host" />
              <span class="port" v-text="`:${row.port}`" v-if="row.port" />
            </span>
            <span class="col-username" v-text="row.username" />
            <span class="col-auth">
              <span v-text="row.auth" />
              <i
                v-if="row.auth === 'Agent' && !agentStatus.ok"
                class="material-icons warning-icon"
                >error_outline</i
              >
            </span>
            <span class="col-action">
              <button
                v-if="sortedConfigs.length > 1"
                type="button"
                class="btn btn-fab remove-btn"
                @click.stop="$emit('remove', row.position)"
              >
                <i class="material-icons">clear</i>
              </button>
            </span>
          </div>
        </draggable>

        <button
          type="button"
          class="btn btn-flat add-host-btn"
          @click="$emit('add')"
        >
          Add Jump Host
        </button>
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
            @input="
              $emit(
                'update-ssh-config',
                selectedPosition,
                'host',
                $event.target.value
              )
            "
          />
        </div>
        <div class="col s3 form-group">
          <label>Port</label>
          <input
            type="number"
            class="form-control"
            :value="selectedConfig.port"
            @input="
              $emit(
                'update-ssh-config',
                selectedPosition,
                'port',
                Number($event.target.value)
              )
            "
          />
        </div>
      </div>
      <div class="form-group">
        <label>Authentication</label>
        <select
          class="form-control"
          :value="selectedConfig.mode"
          @change="
            $emit(
              'update-ssh-config',
              selectedPosition,
              'mode',
              $event.target.value
            )
          "
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
          @input="
            $emit('update-ssh-config', selectedPosition, 'username', $event)
          "
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
            @input="
              $emit('update-ssh-config', selectedPosition, 'keyfile', $event)
            "
          />
        </div>
        <div class="row form-group">
          <label>Key Passphrase <span class="hint">(Optional)</span></label>
          <input
            type="password"
            class="form-control"
            :value="selectedConfig.keyfilePassword"
            @input="
              $emit(
                'update-ssh-config',
                selectedPosition,
                'keyfilePassword',
                $event.target.value
              )
            "
          />
        </div>
      </div>
      <div v-if="selectedConfig.mode === 'userpass'" class="form-group">
        <label>Password</label>
        <input
          type="password"
          class="form-control"
          :value="selectedConfig.password"
          @input="
            $emit(
              'update-ssh-config',
              selectedPosition,
              'password',
              $event.target.value
            )
          "
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import Draggable from "vuedraggable";
import FilePicker from "@/components/common/form/FilePicker.vue";
import ExternalLink from "@/components/common/ExternalLink.vue";
import MaskedInput from "@/components/MaskedInput.vue";
import {
  TransportConnectionSshConfig,
  TransportSshConfig,
} from "@/common/transport/TransportSshConfig";
import _ from "lodash";
import { mapState } from "vuex";

export default Vue.extend({
  components: { Draggable, FilePicker, ExternalLink, MaskedInput },

  props: {
    sshConfigs: {
      type: Array as PropType<TransportConnectionSshConfig[]>,
      required: true,
    },
    selectedPosition: Number,
  },

  computed: {
    sortedConfigs(): TransportConnectionSshConfig[] {
      return _.sortBy(this.sshConfigs || [], "position");
    },
    rows() {
      const authLabels = {
        keyfile: "Key File",
        userpass: "Password",
        agent: "Agent",
      } as const;
      const configs: TransportConnectionSshConfig[] = this.sortedConfigs;
      return configs.map((config: TransportConnectionSshConfig) => {
        const host = config.sshConfig.host || "";
        const port = config.sshConfig.port;
        const username = config.sshConfig.username || "";
        const auth = authLabels[config.sshConfig.mode] || "";
        return { position: config.position, host, port, username, auth };
      });
    },
    selectedConfig(): TransportSshConfig | null {
      if (this.selectedPosition === null) {
        return null;
      }
      const join = this.sortedConfigs.find(
        (j) => j.position === this.selectedPosition
      );
      return join?.sshConfig ?? null;
    },
    filePickerDefaultPath(): string {
      return window.main.join(window.platformInfo.homeDirectory, ".ssh");
    },
    enableSshLink(): string {
      return "https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap";
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
    ...mapState("settings", ["privacyMode"]),
  },

  methods: {
    authLabel(mode: string): string {
      return (
        { keyfile: "Key File", userpass: "Password", agent: "Agent" }[mode] ??
        mode
      );
    },
    onDragEnd(event: any) {
      const { oldIndex, newIndex } = event;
      if (oldIndex === newIndex) {
        return;
      }
      this.$emit("reorder", { oldIndex, newIndex });
    },
  },
});
</script>

<style lang="scss" scoped>
.ssh-table-container {
  display: flex;
  gap: 0.75rem;
}

.ssh-orders {
  display: flex;
  flex-direction: column;
  padding-top: calc(1.5rem + 3px);
  gap: 3px;
  color: var(--text-lighter);

  > * {
    height: 2.14rem;
    width: 0.75rem;
    display: flex;
    align-items: center;
    position: relative;

    &.host-bullet::before {
      content: "";
      width: 0.75rem;
      height: 0.75rem;
      background-color: currentColor;
      border-radius: 9999px;
    }

    &.add-host-bullet {
      .material-icons {
        font-size: 1em;
      }
    }

    &:not(:last-child)::after {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: -0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Material Icons";
      font-size: 1em;
      content: "more_vert";
    }
  }
}

.ssh-list-wrap {
  flex: 1;
  min-width: 0;
}

.ssh-list-header,
.ssh-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.831rem;

  .col-host {
    flex: 2;
    min-width: 0;
    display: flex;
    align-items: center;
    overflow: hidden;

    .host {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .port {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }

  .col-username {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-auth {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.2em;
  }

  .col-action {
    width: 2rem;
    display: flex;
    justify-content: flex-end;
  }
}

.ssh-list-header {
  color: var(--text-lighter);
  padding: 0 0.4rem 0 1.8rem;
  height: 1.5rem;
}

.ssh-row {
  background-color: rgb(from var(--theme-base) r g b / 5%);
  border-radius: 5px;
  margin: 3px 0;
  height: 2.14rem;
  color: var(--text-dark);

  &.selected {
    outline: 1px solid var(--input-highlight);
    outline-offset: -1px;
  }

  .drag-handle {
    color: var(--text-lighter);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 0.2rem;
    width: 1.5rem;
    height: 100%;

    &:hover {
      background-color: rgb(from var(--theme-base) r g b / 5%);
    }

    &::before {
      content: "";
      height: 60%;
      width: 20%;
      display: block;
      border-inline: 1px solid var(--border-color);
    }
  }

  .col-auth .warning-icon {
    color: var(--brand-warning);
    font-size: 1.3em;
  }
}

.remove-btn {
  margin: 0;
  background-color: transparent;

  &:hover .material-icons {
    color: var(--text-dark);
  }

  i.material-icons {
    color: var(--text-lighter);
    font-size: 1.3em;
  }
}

.btn.add-host-btn {
  width: 100%;
  padding-left: 2.5rem;
  color: var(--text-dark);
  font-size: 0.831rem;
  font-weight: normal;
  justify-content: flex-start;
  border-radius: 5px;
  border: none;
  background-color: rgb(from var(--theme-base) r g b / 4%);

  &:hover,
  &:focus {
    font-weight: normal;
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
</style>
