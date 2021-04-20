<template>
  <div class="host-port-user-password">
    <div class="row gutter">
      <div class="col s9 form-group">
        <label for="Host">Host</label>
        <input type="text" class="form-control" @paste="onPaste" name="host" v-model="config.host">
      </div>
      <div class="col s3 form-group">
        <label for="port">Port</label>
        <input type="number" class="form-control" name="port" v-model.number="config.port">
      </div>
    </div>

    <div class="advanced-connection-settings">
      <div class="flex">
        <span @click.prevent="toggleSslAdvanced" class="btn btn-link btn-fab">
          <i class="material-icons">{{toggleIcon}}</i>
        </span>
        <h4 class="advanced-heading flex" :class="{enabled: config.ssl}">
          <span class="expand">Enable SSL</span>
          <x-switch @click.prevent="toggleSsl" :toggled="config.ssl"></x-switch>
        </h4>
      </div>

      <div class="advanced-body" v-show="sslToggled">
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons">info</i>
            <p>
              Providing certificate files is optional. By default Beekeeper will just trust the server certificate.
              <external-link href="https:/docs.beekeeperstudio.io/guide/#ssl">Read More</external-link>
            </p>
          </div>
        </div>
        <div class="row gutter">
          <div class="col form-group">
            <label>CA Cert (optional)</label>
            <file-picker v-model="config.sslCaFile" :disabled="!config.ssl"></file-picker>
          </div>
        </div>

        <div class="row gutter">
          <div class="col form-group">
            <label>Certificate (optional)</label>
            <file-picker v-model="config.sslCertFile" :disabled="!config.ssl"></file-picker>
          </div>
        </div>

        <div class="row gutter">
          <div class="col form-group">
            <label>Key File (optional)</label>
            <file-picker v-model="config.sslKeyFile" :disabled="!config.ssl"></file-picker>
          </div>
        </div>
        <div class="row gutter">
          <div class="col form-group">
            <label class="checkbox-group" for="reject">
              <input class="form-control" id="reject" type="checkbox" name="rememberPassword" v-model="config.sslRejectUnauthorized">
              <span>Reject Unauthorized</span>
              <i class="material-icons" v-tooltip="'This only takes effect if you provide certificate files'">help_outlined</i>
            </label>

          </div>

        </div>
      </div>
    </div>

    <div class="row gutter">
      <div class="col s6 form-group">
        <label for="user">User</label>
        <input type="text" name="user" v-model="config.username" class="form-control">
      </div>
      <div class="col s6 form-group">
        <label for="password">Password</label>
        <input type="password" v-model="config.password" class="form-control">
      </div>
    </div>
    <slot></slot>
    <div class="form-group expand">
      <label for="defaultDatabase">Default Database</label>
      <input type="text" class="form-control" v-model="config.defaultDatabase">
    </div>
  </div>
</template>

<script>
import FilePicker from '@/components/common/form/FilePicker'
import ExternalLink from '@/components/common/ExternalLink'

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
      }
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
