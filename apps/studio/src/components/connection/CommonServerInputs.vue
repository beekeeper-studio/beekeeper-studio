<template>
  <div class="host-port-user-password">
    <slot name="header" />
    <div class="row">
      <div
        class="form-group col"
        v-if="supportsSocketPath"
      >
        <label for="connectionMode">Connection Mode</label>
        <select
          name=""
          v-model="config.socketPathEnabled"
          id=""
          :disabled="disabled"
        >
          <option :value="false">
            Host and Port
          </option>
          <option :value="true">
            Socket
          </option>
        </select>
      </div>
    </div>
    <div
      class="row gutter"
      v-show="config.socketPathEnabled"
    >
      <div class="col form-group" :class="{ s9: supportsSocketPathWithCustomPort }">
        <label for="socketPath">Socket Path</label>
        <input
          id="socketPath"
          class="form-control"
          v-model="config.socketPath"
          type="text"
          name="socketPath"
          :disabled="disabled"
        >
      </div>
      <div class="col s3 form-group" v-if="supportsSocketPathWithCustomPort">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :type="'number'"
          @input="val => config.port = val"
          :disabled="disabled"
        />
      </div>
    </div>
    <div
      class="row gutter"
      v-show="!config.socketPathEnabled"
    >
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <masked-input
          :value="config.host"
          @input="val => config.host = val"
          @change.native="$emit('host-change')"
          @paste.native="onHostPaste"
          :disabled="disabled"
        />
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :type="'number'"
          @input="val => config.port = val"
          :disabled="disabled"
        />
      </div>
    </div>

    <common-ssl
      v-if="!hideSsl"
      :config="config"
      :ssl-help="sslHelp"
      :support-complex-s-s-l="supportComplexSSL"
      :disabled="disabled"
    />

    <div v-if="!hideCredentials" class="row gutter">
      <div class="col form-group" :class="[showPasswordForm ? 's6' : 's12']">
        <label for="user">User</label>
        <masked-input
          :value="config.username"
          @input="val => config.username = val"
          :disabled="disabled"
        />
      </div>
      <div class="col s6 form-group" v-show="showPasswordForm">
        <label for="password">{{ passwordLabel }}</label>
        <password-input v-model="config.password" :disabled="disabled" />
      </div>
    </div>
    <slot />
    <div class="form-group expand">
      <label
        v-if="!['cassandra', 'scylladb'].includes(config.connectionType)"
        for="defaultDatabase"
      >Default {{ topLevelEntityName }}</label>
      <label
        v-else
        for="defaultDatabase"
      >Keyspace <span class="optional-text">(optional)</span></label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
        :disabled="disabled"
      >
    </div>
  </div>
</template>

<script>
import { findClient } from '@/lib/db/clients'
import MaskedInput from '@/components/MaskedInput.vue'
import PasswordInput from '@/components/common/form/PasswordInput.vue'
import CommonSsl from './CommonSsl.vue'
import { mapGetters } from 'vuex'
import { looksLikeConnectionPaste, HOST_PASTE_FIELDS } from '@/common/hostPaste'
import { sqlServerHostFieldSplit } from '@shared/lib/dialects/sqlserverHost'

export default {
  props: {
    config: Object,
    sslHelp: String,
    supportComplexSSL: {
      type: Boolean,
      default: true
    },
    showPasswordForm: {
      type: Boolean,
      default: true
    },
    // Used by SqlServerForm to hide user/password when integrated auth is selected.
    hideCredentials: {
      type: Boolean,
      default: false
    },
    // Used by SqlServerForm to hide the SSL section when integrated auth provides its own
    // Encrypt toggle (the ODBC driver only supports Encrypt + TrustServerCertificate).
    hideSsl: {
      type: Boolean,
      default: false
    },
    passwordLabel: {
      type: String,
      default: 'Password'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    MaskedInput,
    PasswordInput,
    CommonSsl
  },
  computed: {
    ...mapGetters('settings', ['privacyMode']),
    supportsSocketPath() {
      return findClient(this.config.connectionType).supportsSocketPath
    },
    supportsSocketPathWithCustomPort() {
      return findClient(this.config.connectionType).supportsSocketPathWithCustomPort
    },
    topLevelEntityName() {
      return findClient(this.config.connectionType).topLevelEntity || 'Database'
    }
  },
  methods: {
    // Pasting a connection URL or `host:port` into Host fills the fields it names. A plain
    // hostname is left to paste as ordinary text. The decision has to be synchronous: once
    // the handler awaits, the paste can no longer be cancelled.
    onHostPaste(event) {
      if (this.disabled || this.privacyMode) return
      const text = (event.clipboardData?.getData('text') || '').trim()

      // SSMS writes the port after a comma, which the URL parser reads as a second host.
      if (this.config.connectionType === 'sqlserver') {
        const split = sqlServerHostFieldSplit(text)
        if (split) {
          event.preventDefault()
          this.config.host = split.host
          this.config.port = split.port
          return
        }
      }

      if (!looksLikeConnectionPaste(text)) return
      event.preventDefault()
      this.applyPastedConnection(text)
    },
    async applyPastedConnection(text) {
      let fields = null
      try {
        fields = await this.$util.send('appdb/saved/parseUrlFields', { url: text })
      } catch {
        fields = null
      }
      // Nothing usable came back, and the paste is already cancelled: keep the text.
      if (!fields || !fields.host) {
        this.config.host = text
        return
      }
      // Only what the text states. A paste with no user in it keeps the User field.
      for (const key of HOST_PASTE_FIELDS) {
        if (fields[key] !== undefined && fields[key] !== null) this.config[key] = fields[key]
      }
      if (fields.ssl) this.config.ssl = true
      if (fields.trustServerCertificate) this.config.trustServerCertificate = true
    },
  }
}
</script>

<style lang="scss" scoped>
.optional-text {
  font-style: italic;
  padding-left: .2rem;
}
</style>
