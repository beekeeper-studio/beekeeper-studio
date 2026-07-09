<template>
  <form action="#" @submit.prevent>
    <div class="row gutter">
      <div class="col s9 form-group">
        <label>Hostname</label>
        <input
          type="text"
          class="form-control"
          name="host"
          :value="ssh.host"
          @input="update"
        />
      </div>
      <div class="col s3 form-group">
        <label>Port</label>
        <input
          type="number"
          class="form-control"
          name="port"
          :value="ssh.port"
          @input="update"
        />
      </div>
    </div>
    <div class="form-group">
      <label>Authentication</label>
      <select
        class="form-control"
        :value="ssh.mode"
        name="mode"
        @change="update"
      >
        <option
          v-for="option in [
            { label: 'Automatic', mode: 'agent' },
            { label: 'Key File', mode: 'keyfile' },
            { label: 'Username & Password', mode: 'userpass' },
          ]"
          :key="option.mode"
          :value="option.mode"
        >
          {{ option.label }}
        </option>
      </select>
      <div class="hint">
        <auto-mode-status
          v-if="ssh.mode === 'agent'"
          :ssh-auth-sock="$config.sshAuthSock"
          :is-windows="$config.isWindows"
          :ssh-config-exists="$config.sshConfigExists"
          :ssh-config-path="$config.sshDirectory"
          :default-ssh-identity-file="$config.defaultSshIdentityFile"
          :home-directory="$config.homeDirectory"
        />
      </div>
      <div class="ssh-agent-indicator" v-if="ssh.mode === 'agent'">
        <platform-warning location="ssh-agent" />
        <template v-if="agentStatus.ok && !agentStatus.warning" />
        <div
          v-else-if="agentStatus.warning === 'win-nix-agent-not-found'"
          class="info"
        >
          <i class="material-icons-outlined">info</i>
          <div>
            We didn't find a *nix ssh-agent running, so we'll attempt to use the
            PuTTY agent, pageant.
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
        :value="ssh.username"
        :privacy-mode="privacyMode"
        @input="updateByField('username', $event)"
      />
    </div>
    <div v-if="ssh.mode === 'keyfile'" class="private-key gutter">
      <div v-if="$config.isSnap && !$config.snapSshPlug" class="row">
        <div class="alert alert-warning">
          <i class="material-icons">error_outline</i>
          <div>
            Hey snap user! You need to
            <external-link :href="enableSshLink"
              >enable SSH access</external-link
            >, then restart Beekeeper to provide access to your .ssh directory.
          </div>
        </div>
      </div>
      <platform-warning location="ssh-keyfile" />
      <div class="row form-group">
        <label>Private Key File</label>
        <file-picker
          :value="ssh.keyfile"
          editable
          :show-hidden-files="true"
          :default-path="$config.sshDirectory"
          @input="updateByField('keyfile', $event)"
        />
      </div>
      <div class="row form-group">
        <label for="sshKeyfilePassword">
          Key File PassPhrase <span class="hint">(Optional)</span>
        </label>
        <input
          id="sshKeyfilePassword"
          type="password"
          class="form-control"
          :value="ssh.keyfilePassword"
          name="keyfilePassword"
          @input="update"
        />
      </div>
    </div>
    <div v-if="ssh.mode === 'userpass'" class="form-group">
      <label for="sshPassword">Password</label>
      <input
        id="sshPassword"
        type="password"
        class="form-control"
        :value="ssh.password"
        name="password"
        @input="update"
      />
    </div>
  </form>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { mapGetters } from "vuex";
import FilePicker from "@/components/common/form/FilePicker.vue";
import ExternalLink from "@/components/common/ExternalLink.vue";
import MaskedInput from "@/components/MaskedInput.vue";
import PlatformWarning from "./PlatformWarning.vue";
import AutoModeStatus from "./AutoModeStatus.vue";
import { TransportSshConfig } from "@/common/transport/TransportSshConfig";

export default Vue.extend({
  props: {
    ssh: {
      type: Object as PropType<TransportSshConfig>,
      required: true,
    },
  },
  components: {
    FilePicker,
    ExternalLink,
    MaskedInput,
    PlatformWarning,
    AutoModeStatus,
  },
  computed: {
    ...mapGetters({
      privacyMode: "settings/privacyMode",
    }),
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
    enableSshLink() {
      return "https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap";
    },
  },
  methods: {
    update(event: Event) {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      this.updateByField(target.name, target.value);
    },
    updateByField(field: string, value: unknown) {
      if (field === "port") {
        value = value === "" ? null : Number(value);
      }
      this.$emit("update", { ...this.ssh, [field]: value });
    },
  },
});
</script>

<style scoped>
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
