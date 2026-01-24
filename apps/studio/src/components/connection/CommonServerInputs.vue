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
        >
      </div>
      <div class="col s3 form-group" v-if="supportsSocketPathWithCustomPort">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :privacy-mode="privacyMode"
          :type="'number'"
          @input="val => config.port = val"
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
          :privacy-mode="privacyMode"
          @input="val => config.host = val"
        />
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <masked-input
          :value="config.port"
          :privacy-mode="privacyMode"
          :type="'number'"
          @input="val => config.port = val"
        />
      </div>
    </div>

    <toggle-form-area
      title="Enable SSL"
      v-if="supportComplexSSL && supportsSsl"
    >
      <template v-slot:header>
        <x-switch
          @click.prevent="toggleSsl"
          :toggled="config.ssl"
        />
      </template>

      <template v-slot:default>
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>
              Providing certificate files is optional. By default Beekeeper will just trust the server certificate.
              <external-link href="https://docs.beekeeperstudio.io/user_guide/connecting/connecting/#ssl">
                Read More
              </external-link>
            </div>
          </div>
        </div>
        <div class="row gutter">
          <div class="col form-group">
            <label>CA Cert (optional)</label>
            <file-picker
              v-model="config.sslCaFile"
              :disabled="!config.ssl"
            />
          </div>
        </div>

        <div class="row gutter">
          <div class="col form-group">
            <label>Certificate (optional)</label>
            <file-picker
              v-model="config.sslCertFile"
              :disabled="!config.ssl"
            />
          </div>
        </div>

        <div class="row gutter">
          <div class="col form-group">
            <label>Key File (optional)</label>
            <file-picker
              v-model="config.sslKeyFile"
              :disabled="!config.ssl"
            />
          </div>
        </div>
        <div class="row gutter">
          <div class="col form-group">
            <label
              class="checkbox-group"
              for="reject"
            >
              <input
                class="form-control"
                id="reject"
                type="checkbox"
                name="rememberPassword"
                v-model="config.sslRejectUnauthorized"
              >
              <span>Reject Unauthorized</span>
              <i
                class="material-icons"
                v-tooltip="'This only takes effect if you provide certificate files'"
              >help_outlined</i>
            </label>
          </div>
        </div>
      </template>
    </toggle-form-area>


    <!-- Simple SSL -->
    <div
      v-else-if="supportsSsl"
      class="advanced-connection-settings"
    >
      <div class="flex flex-middle">
        <h4
          class="advanced-heading flex"
          :class="{enabled: config.ssl}"
        >
          <span class="expand">Enable SSL</span>
          <x-switch
            @click.prevent="toggleSsl"
            :toggled="config.ssl"
          />
        </h4>
      </div>
      <small class="text-muted help">{{ sslHelp }}</small>
    </div>

    <div class="row gutter">
      <div class="col form-group" :class="[showPasswordForm ? 's6' : 's12']">
        <label for="user">User</label>
        <masked-input
          :value="config.username"
          :privacy-mode="privacyMode"
          @input="val => config.username = val"
        />
      </div>
      <div class="col s6 form-group" v-show="showPasswordForm">
        <label for="password">Password</label>
        <input
          :type="togglePasswordInputType"
          v-model="config.password"
          class="password form-control"
        >
        <i
          @click.prevent="togglePassword"
          class="material-icons password-icon"
        >{{ togglePasswordIcon }}</i>
      </div>
    </div>
    <slot />
    <div class="form-group expand">
      <label
        v-if="config.connectionType !== 'cassandra'"
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
      >
    </div>
  </div>
</template>

<script>
import FilePicker from '@/components/common/form/FilePicker.vue'
import ExternalLink from '@/components/common/ExternalLink.vue'
import { findClient } from '@/lib/db/clients'
import ToggleFormArea from '../common/ToggleFormArea.vue'
import MaskedInput from '@/components/MaskedInput.vue'
import { mapState } from 'vuex'

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
    }
  },
  components: {
    FilePicker,
    ExternalLink,
    ToggleFormArea,
    MaskedInput
  },
  data() {
    return {
      sslToggled: false,
      showPassword: false,
    }
  },
  computed: {
    ...mapState('settings', ['privacyMode']),
    hasAdvancedSsl() {
      return this.config.sslCaFile || this.config.sslCertFile || this.config.sslKeyFile
    },
    toggleIcon() {
      return this.sslToggled ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
    },
    togglePasswordIcon() {
      return this.showPassword ? "visibility_off" : "visibility"
    },
    togglePasswordInputType() {
      return this.showPassword ? "text" : "password"
    },
    supportsSsl() {
      return findClient(this.config.connectionType).supports('server:ssl')
    },
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
    async onPaste(event) {
      const data = event.clipboardData.getData('text')
      try {
        await this.$util.send('appdb/saved/parseUrl', { url: data });
        event.preventDefault();
      } catch {
        return;
      }
    },
    toggleSsl() {
      this.config.ssl = !this.config.ssl

      // Remove CA file when disabling ssl
      if (!this.config.ssl) {
        this.config.sslCaFile = null
        this.config.sslCertFile = null
        this.config.sslKeyFile = null
      }
    },
    toggleSslAdvanced() {
      this.sslToggled = !this.sslToggled;
    },
    togglePassword() {
      this.showPassword = !this.showPassword
    }
  },
  mounted() {
    this.sslToggled = this.hasAdvancedSsl
  }
}
</script>

<style lang="scss" scoped>
.optional-text {
  font-style: italic;
  padding-left: .2rem;
}
</style>
