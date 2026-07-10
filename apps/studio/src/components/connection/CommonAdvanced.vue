<template>
  <toggle-form-area
    title="SSH Tunnel"
    :expanded="config.sshEnabled"
  >
    <template #header>
      <x-switch
        @click.prevent="config.sshEnabled = !config.sshEnabled"
        :toggled="config.sshEnabled"
      />
    </template>
    <template>
      <div class="row alert-row">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.</div>
        </div>
      </div>

      <ssh-jump-hosts
        v-bind:selected-position.sync="selectedPosition"
        :config="config"
        @add="onAdd"
        @remove="onRemove"
        @reorder="onReorder"
      />

      <ssh-config-form
        v-if="selectedSshConfig"
        :ssh="selectedSshConfig"
        @update="onUpdateSelected"
      />

      <details class="advanced-settings">
        <summary>
          <i class="material-icons toggle-icon">keyboard_arrow_right</i>
          <h5>Advanced Settings</h5>
        </summary>
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
import ToggleFormArea from '../common/ToggleFormArea.vue'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'
import SshConfigForm from '@/components/connection/SshConfigForm.vue'
import _ from 'lodash'
import { TransportConnectionSshConfig, TransportSshConfig } from "@/common/transport/TransportSshConfig";
import Vue, { PropType } from 'vue'
import { IConnection } from '@/common/interfaces/IConnection'

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
    SshConfigForm,
  },
  data() {
    return {
      selectedPosition: this.config.sshConfigs?.[0]?.position ?? -1,
    }
  },
  computed: {
    sshConfigs(): TransportConnectionSshConfig[] {
      return this.config.sshConfigs ?? [];
    },
    selectedSshConfig(): TransportSshConfig | null {
      return this.sshConfigs.find(
        (join) => join.position === this.selectedPosition
      )?.sshConfig ?? null;
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
          sshConfig: {
            host: '',
            port: null,
            mode: 'agent',
            username: '',
            password: null,
            keyfile: null,
            keyfilePassword: null,
          },
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
    onUpdateSelected(sshConfig: TransportSshConfig) {
      const index = this.sshConfigs.findIndex(
        (join) => join.position === this.selectedPosition
      )
      if (index === -1) {
        return
      }
      const updated = [...this.sshConfigs]
      updated[index] = { ...updated[index], sshConfig }
      this.$set(this.config, 'sshConfigs', updated)
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

.advanced-settings  {

  > summary {
    display: flex;
    align-items: center;
    cursor: pointer;
    list-style: none;
    margin-top: 1rem;

    h5 {
      margin: 0;
      display: inline-block;
    }

    &::-webkit-details-marker {
      display: none;
    }

    .toggle-icon {
      font-size: 1.25rem;
      color: var(--text);
      transition: transform 0.15s ease;
      margin-left: -0.25rem;
    }
  }

  &[open] > summary .toggle-icon {
    transform: rotate(90deg);
  }
}

@media (prefers-color-scheme: dark) {
  body.theme-system .bastion-host {
    background-color: rgb(from var(--theme-base) r g b / 3.5%);
  }
}
</style>
