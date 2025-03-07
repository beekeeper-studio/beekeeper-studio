<template>
  <div class="host-port-user-password">
    <slot name="header"></slot>
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
        <input
          type="number"
          class="form-control"
          name="port"
          v-model.number="config.port"
        >
      </div>
    </div>
    <div
      class="row gutter"
      v-show="!config.socketPathEnabled"
    >
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <input
          type="text"
          class="form-control"
          @paste="onPaste"
          name="host"
          v-model="config.host"
        >
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <input
          type="number"
          class="form-control"
          name="port"
          v-model.number="config.port"
        >
      </div>
    </div>

    <toggle-form-area
      title="Enable SSL"
      v-if="supportComplexSSL"
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
              <external-link href="https://docs.beekeeperstudio.io/pages/first-page#ssl">
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
      v-else
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
      <div class="col s6 form-group">
        <label for="user">User</label>
        <input
          type="text"
          name="user"
          v-model="config.username"
          class="form-control"
        >
      </div>
      <div class="col s6 form-group">
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
      >Default Database</label>
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

  export default {
    props: {
      config: Object,
      sslHelp: String,
      supportComplexSSL: {
        type: Boolean,
        default: true
      }
    },
    components: {
      FilePicker,
      ExternalLink,
      ToggleFormArea
    },
    data() {
      return {
        sslToggled: false,
        showPassword: false,
      }
    },
    computed: {
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
      supportsSocketPath() {
        return findClient(this.config.connectionType).supportsSocketPath
      },
      supportsSocketPathWithCustomPort() {
        return findClient(this.config.connectionType).supportsSocketPathWithCustomPort
      },
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
