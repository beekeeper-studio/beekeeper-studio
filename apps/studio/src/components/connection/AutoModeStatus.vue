<template>
  <div class="auto-mode-status">
    <span
      class="badge"
      :class="{ ok: agentAvailable, missing: !agentAvailable }"
      v-tooltip="agentTooltip"
    >
      <span>Agent</span>
    </span>
    <span
      class="badge"
      :class="{ ok: sshConfigExists, missing: !sshConfigExists }"
      v-tooltip="configLabel"
    >
      <span>SSH Config</span>
    </span>
    <span
      class="badge"
      :class="{ ok: !!defaultSshIdentityFile, missing: !defaultSshIdentityFile }"
      v-tooltip="defaultKeyLabel"
    >
      <span>Default Key</span>
    </span>
    <button
      class="btn btn-fab"
      v-tooltip="'About Automatic mode'"
      type="button"
      @click.prevent="$modal.show('auto-mode-help')"
    >
      <i class="material-icons" style="width: 1em;">help_outlined</i>
    </button>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal auto-mode-help-modal"
        name="auto-mode-help"
        height="auto"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            Automatic SSH authentication
          </div>
          <p>
            Like <code>ssh</code> on the command line, each source below is
            tried in order — the first one that authenticates is used.
          </p>
          <ol class="auto-mode-help-list">
            <li>
              <div class="list-item-heading">
                <strong>SSH agent</strong>
                <i v-if="sshAuthSock" class="material-icons">check</i>
              </div>
              <div class="list-item-body">
                <code v-if="sshAuthSock">{{ privacyMode ? '******' : sshAuthSock }}</code>
                <span v-else-if="isWindows">Not set — PuTTY's pageant will be used if it's running.</span>
                <span v-else>Not detected — skipped.</span>
              </div>
            </li>
            <li>
              <div class="list-item-heading">
                <strong>SSH config</strong>
                <i v-if="sshConfigExists" class="material-icons">check</i>
              </div>
              <div class="list-item-body">
                <code v-if="sshConfigExists">{{ privacyMode ? '******' : sshConfigPath }}</code>
                <span v-else>Not detected — skipped.</span>
              </div>
            </li>
            <li>
              <div class="list-item-heading">
                <strong>Default key </strong>
                <i v-if="defaultSshIdentityFile" class="material-icons">check</i>
              </div>
              <div class="list-item-body">
                <code v-if="defaultSshIdentityFile">{{ privacyMode ? '******' : defaultSshIdentityFile }}</code>
                <span v-else>Not detected — skipped.</span>
              </div>
            </li>
          </ol>
        </div>
        <div class="vue-dialog-buttons">
          <a
            class="btn btn-flat"
            href="https://docs.beekeeperstudio.io/user_guide/connecting/connecting/#automatic-authentication-default"
          >
            Learn more
          </a>
          <button
            class="btn btn-primary"
            type="button"
            @click.prevent="$modal.hide('auto-mode-help')"
          >
            Close
          </button>
        </div>
      </modal>
    </portal>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

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
    ...mapGetters('settings', ['privacyMode']),
    docsUrl() {
      return 'https://docs.beekeeperstudio.io/user_guide/connecting/connecting/#automatic-authentication-default'
    },
    agentAvailable() {
      // On Windows ssh2 falls back to PuTTY's pageant when SSH_AUTH_SOCK
      // is not set, so the agent is effectively always available there.
      return !!this.sshAuthSock || this.isWindows
    },
    agentTooltip() {
      return this.agentAvailable ? 'Using SSH agent' : 'No SSH agent'
    },
    configLabel() {
      return this.sshConfigExists ? 'Using SSH config' : 'No SSH config'
    },
    defaultKeyLabel() {
      return this.defaultSshIdentityFile ? 'Using default key' : 'No default key'
    },
    defaultKeyCandidates() {
      const sshDir = this.homeDirectory
        ? window.main.join(this.homeDirectory, '.ssh')
        : '~/.ssh'
      return DEFAULT_KEY_NAMES.map((name) => `${sshDir}/${name}`)
    },
  },
}
</script>

<style scoped>
.auto-mode-status {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-wrap: wrap;
  margin-top: 0.1rem;

  .arrow {
    font-size: 1em;
    margin-inline: 0.1rem;
  }

  .label {
    margin-right: 0.5rem;
  }

  .badge {
    display: flex;
    gap: 0.25rem;
    margin: 0;
    align-items: center;
    text-transform: none;
    font-weight: 600;

    &.missing {
      /* text-decoration-line: line-through; */
      opacity: 0.5;
    }

    .material-icons {
      font-size: 12px;
    }
  }

  .btn-fab {
    margin: 0;
    min-width: 0;
    height: 1.2em;
    width: 1.2em;
    background-color: transparent;

    .material-icons {
      width: 1em;
      font-size: 1.1em;
      color: var(--text-lighter);
    }
  }
}

.list-item-heading {
  display: flex;
  align-items: center;
  gap: 0.25rem;

  .material-icons {
    font-size: 1em;
  }
}

.list-item-body {
  padding-block: 0.25rem;
}

.auto-mode-help-list {
  padding-left: 1.25rem;
  margin: 0.5rem 0 1rem;

  > li {
    margin-bottom: 0.5rem;
  }

  code {
    word-break: break-all;
  }
}

.path-list {
  list-style: none;
  padding-left: 0;
  margin: 0.25rem 0 0;
}

</style>
