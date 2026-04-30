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
    <i class="material-icons sep">chevron_right</i>
    <span
      class="status-item"
      :class="{ ok: sshConfigExists, missing: !sshConfigExists }"
      v-tooltip="configTooltip"
    >
      <i class="material-icons">{{ sshConfigExists ? 'check_circle' : 'cancel' }}</i>
      <span>SSH config</span>
    </span>
    <i class="material-icons sep">chevron_right</i>
    <span
      class="status-item"
      :class="{ ok: !!defaultSshIdentityFile, missing: !defaultSshIdentityFile }"
      v-tooltip="{ content: defaultKeyTooltip, html: true }"
    >
      <i class="material-icons">{{ defaultSshIdentityFile ? 'check_circle' : 'cancel' }}</i>
      <span>Default key</span>
    </span>
  </div>
</template>

<script>
const DEFAULT_KEY_NAMES = ['id_ed25519', 'id_ecdsa', 'id_rsa', 'id_dsa']

export default {
  props: {
    sshAuthSock: { type: String, default: '' },
    isWindows: { type: Boolean, default: false },
    sshConfigExists: { type: Boolean, default: false },
    sshConfigPath: { type: String, default: '' },
    defaultSshIdentityFile: { type: String, default: '' },
    homeDirectory: { type: String, default: '' },
  },
  computed: {
    agentAvailable() {
      // On Windows ssh2 falls back to PuTTY's pageant when SSH_AUTH_SOCK
      // is not set, so the agent is effectively always available there.
      return !!this.sshAuthSock || this.isWindows
    },
    agentTooltip() {
      if (this.sshAuthSock) {
        return `ssh-agent socket: ${this.sshAuthSock}`
      }
      if (this.isWindows) {
        return "SSH_AUTH_SOCK is not set. PuTTY's pageant will be used if it's running."
      }
      return "No running ssh-agent found."
    },
    configTooltip() {
      if (this.sshConfigExists) {
        return `Config found at ${this.sshConfigPath}`
      }
      return `No ssh config at ${this.sshConfigPath}`
    },
    defaultKeyTooltip() {
      if (this.defaultSshIdentityFile) {
        return `Default key: ${this.defaultSshIdentityFile}`
      }
      const sshDir = this.homeDirectory
        ? window.main.join(this.homeDirectory, '.ssh')
        : '~/.ssh'
      const candidates = DEFAULT_KEY_NAMES
        .map((name) => `${sshDir}/${name}`)
        .join('<br>')
      return `No default key found. Paths checked:<br>${candidates}`
    },
  },
}
</script>

<style scoped>
.auto-mode-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.85em;
  flex-wrap: wrap;
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
.sep {
  font-size: 16px;
  opacity: 0.4;
}
</style>
