<template>
  <toggle-form-area
    title="SSH Tunnel"
    @toggleContent="toggleContent = $event"
    :hide-toggle="!config.sshEnabled"
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
          <div>For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.</div>
        </div>
      </div>

      <ssh-jump-hosts
        v-if="toggleContent"
        :ssh-configs="config.sshConfigs || []"
        @add="onAdd"
        @remove="onRemove"
        @reorder="onReorder"
        @update-ssh-config="onUpdateSshConfig"
      />

      <div class="separator" />

      <div class="col form-group">
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
    </template>
  </toggle-form-area>
</template>

<script>
import ToggleFormArea from '../common/ToggleFormArea.vue'
import { mapState } from 'vuex'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'
import _ from 'lodash'

export default {
  props: ['config'],
  components: { ToggleFormArea, SshJumpHosts },
  data() {
    return {
      toggleContent: false,
    }
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
  },
  watch: {
    'config.sshEnabled'(enabled) {
      if (enabled && !(this.config.sshConfigs && this.config.sshConfigs.length)) {
        this.$set(this.config, 'sshConfigs', [{
          connectionId: this.config.id ?? null,
          position: 0,
          sshConfig: {
            host: '',
            port: 22,
            mode: 'agent',
            username: '',
          },
        }])
      }
    },
  },
  methods: {
    onAdd() {
      const sshConfigs = this.config.sshConfigs
        ? [...this.config.sshConfigs]
        : []
      sshConfigs.push({
        connectionId: this.config.id ?? null,
        position: sshConfigs.length,
        sshConfig: {
          host: '',
          port: 22,
          mode: 'agent',
          username: '',
        },
      })
      this.$set(this.config, 'sshConfigs', sshConfigs)
    },
    onRemove(position) {
      const join = this.config.sshConfigs.find((j) => j.position === position)
      if (join?.id) {
        const removedSshConfigs = this.config.removedSshConfigs || []
        this.$set(this.config, 'removedSshConfigs', removedSshConfigs.concat(join))
      }
      const filteredConfigs = this.config.sshConfigs.filter((j) =>
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
    onReorder(positions) {
      const reordered = []
      for (let i = 0; i < positions.length; i++) {
        reordered.push({
          ...this.config.sshConfigs[positions[i]],
          position: i,
        })
      }
      this.$set(this.config, 'sshConfigs', reordered)
    },
    onUpdateSshConfig(position, field, value) {
      const sshConfigs = _.cloneDeep(this.config.sshConfigs ?? [])
      const join = sshConfigs.find((j) => j.position === position)
      if (join) {
        join.sshConfig[field] = value
      }
      this.$set(this.config, 'sshConfigs', sshConfigs)
    },
  },
}
</script>

<style scoped>
.separator {
  border-top: 1px solid var(--border-color);
  margin-top: 1rem;
  margin-bottom: 0.25rem;
}
</style>
