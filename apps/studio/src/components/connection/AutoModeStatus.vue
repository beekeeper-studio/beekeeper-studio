<template>
  <div class="auto-mode-status">
    <span
      class="status-item"
      :class="{ ok: agentAvailable, missing: !agentAvailable }"
      v-tooltip="agentTooltip"
    >
      <i class="material-icons">{{ agentAvailable ? 'check_circle' : 'cancel' }}</i>
      <span>SSH agent</span>
    </span>
    <span
      class="status-item"
      :class="{ ok: sshConfigExists, missing: !sshConfigExists }"
      v-tooltip="configTooltip"
    >
      <i class="material-icons">{{ sshConfigExists ? 'check_circle' : 'cancel' }}</i>
      <span>SSH config</span>
    </span>
  </div>
</template>

<script>
export default {
  props: {
    sshAuthSock: { type: String, default: '' },
    isWindows: { type: Boolean, default: false },
    sshConfigExists: { type: Boolean, default: false },
    sshConfigPath: { type: String, default: '' },
  },
  computed: {
    agentAvailable() {
      // On Windows we'll fall back to PuTTY's pageant when SSH_AUTH_SOCK
      // is not set, so agent is effectively always available there.
      return !!this.sshAuthSock || this.isWindows
    },
    agentTooltip() {
      if (this.sshAuthSock) {
        return `We found your ssh-agent socket: ${this.sshAuthSock}`
      }
      if (this.isWindows) {
        return "We didn't find SSH_AUTH_SOCK, so we'll use PuTTY's pageant if it's running."
      }
      return "We couldn't find a running ssh-agent to use."
    },
    configTooltip() {
      if (this.sshConfigExists) {
        return `Config found at ${this.sshConfigPath}`
      }
      return `We couldn't find an ssh config at ${this.sshConfigPath}`
    },
  },
}
</script>

<style scoped>
.auto-mode-status {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.85em;
}
.status-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: help;
}
.status-item.ok {
  opacity: 0.85;
}
.status-item.missing {
  opacity: 0.7;
}
.status-item .material-icons {
  font-size: 16px;
}
.status-item.ok .material-icons {
  color: var(--text-success, #4caf50);
}
.status-item.missing .material-icons {
  color: var(--text-error, #e57373);
}
</style>
