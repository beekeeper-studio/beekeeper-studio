<template>
  <div>
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
  </div>
</template>

<script lang="ts">
import FilePicker from '@/components/common/form/FilePicker.vue'
import ExternalLink from '@/components/common/ExternalLink.vue'
import ToggleFormArea from '../common/ToggleFormArea.vue'
import { findClient } from '@/lib/db/clients'
import { PropType } from 'vue'
import { IConnection } from '@/common/interfaces/IConnection'

export default {
  props: {
    config: Object as PropType<IConnection>,
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
      sslToggled: false
    }
  },
  computed: {
    hasAdvancedSsl() {
      return this.config.sslCaFile || this.config.sslCertFile || this.config.sslKeyFile
    },
    toggleIcon() {
      return this.sslToggled ? 'keyboard_arrow_down' : 'keyboard_arrow_right'
    },
    supportsSsl() {
      return findClient(this.config.connectionType).supports('server:ssl')
    }
  },
  methods: {
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
      this.sslToggled = !this.sslToggled
    }
  },
  mounted() {
    this.sslToggled = this.hasAdvancedSsl
  }
}
</script>
