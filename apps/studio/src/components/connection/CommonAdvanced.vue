<template>
  <toggle-form-area
    title="SSH Tunnel"
    @toggleContent="toggleContent = $event"
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
        :config="config"
        :privacy-mode="privacyMode"
      />
    </template>
  </toggle-form-area>
</template>

<script>
import ToggleFormArea from '../common/ToggleFormArea.vue'
import { mapState } from 'vuex'
import SshJumpHosts from '@/components/connection/SshJumpHosts.vue'

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
}
</script>
