<template>
  <div class="host-port-user-password">
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
      <div
        class="form-group col"
        v-show="config.socketPathEnabled"
      >
        <label for="socketPath">Socket Path</label>
        <input
          id="socketPath"
          class="form-control"
          v-model="config.socketPath"
          type="text"
          name="socketPath"
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

    <div
      class="advanced-connection-settings"
      v-show="!config.socketPathEnabled"
    >
      <div class="flex flex-middle">
        <span
          @click.prevent="toggleSslAdvanced"
          class="btn btn-link btn-fab"
        >
          <i class="material-icons">{{ toggleIcon }}</i>
        </span>
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

      <div
        class="advanced-body"
        v-show="sslToggled"
      >
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
      </div>
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
          type="password"
          v-model="config.password"
          class="form-control"
        >
      </div>
    </div>
    <slot />
    <div class="form-group expand">
      <label for="defaultDatabase">Default Database</label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
      >
    </div>
  </div>
</template>

<script>
import FilePicker from '@/components/common/form/FilePicker'
import ExternalLink from '@/components/common/ExternalLink'
import { findClient } from '@/lib/db/clients'

  export default {
    props: ['config'],
    components: {
      FilePicker,
      ExternalLink
    },
    data() {
      return {
        sslToggled: false,
      }
    },
    computed: {
      hasAdvancedSsl() {
        return this.config.sslCaFile || this.config.sslCertFile || this.config.sslKeyFile
      },
      toggleIcon() {
        return this.sslToggled ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
      },
      supportsSocketPath() {
        return findClient(this.config.connectionType).supportsSocketPath
      },
    },
    methods: {
      onPaste(event) {
          const data = event.clipboardData.getData('text')
          if (this.config.parse(data)) {
            event.preventDefault()
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
      }
    },
    mounted() {
      this.sslToggled = this.hasAdvancedSsl
    }
  }
</script>
