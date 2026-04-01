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
      <div class="row gutter alert-row">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <div>For the SSH tunnel to work, AllowTcpForwarding must be set to "yes" in your ssh server config.</div>
        </div>
      </div>

      <ssh-jump-hosts
        v-if="toggleContent"
        :ssh-configs="config.sshConfigs"
        :selected-position="selectedPosition"
        @add="onAdd"
        @remove="onRemove"
        @reorder="onReorder"
        @update-ssh-config="onUpdateSshConfig"
        @select="onSelect"
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
import ToggleFormArea from '../common/ToggleFormArea.vue'
import { mapState, mapGetters } from 'vuex'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'
import _ from 'lodash'
import MaskedInput from '@/components/MaskedInput.vue'


export default {
  props: ['config'],
  components: { ToggleFormArea, SshJumpHosts },
  data() {
    return {
      toggleContent: false,
      selectedPosition: this.config.sshConfigs[0]?.position ?? null,
    }
  },
  computed: {
    ...mapGetters('settings', ['privacyMode']),
  },
  methods: {
    onAdd() {
      const sshConfigs = [...this.config.sshConfigs]
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
    onReorder({ oldIndex, newIndex }) {
      const reordered = _.cloneDeep(this.config.sshConfigs)

      const [moved] = reordered.splice(oldIndex, 1)

      reordered.splice(newIndex, 0, moved)

      for (let i = 0; i < reordered.length; i++) {
        reordered[i].position = i;
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
    onSelect(position) {
      this.selectedPosition = position
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
.alert-row {
  margin-inline: 0;
}
</style>
