<template>
  <div class="with-connection-type sql-server-form">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <!-- need to take the value -->
      <select name="" v-model="authType" id="" :disabled="disabled">
        <option value="default">
          Username / Password
        </option>
        <option value="windows">
          Kerberos / Windows (via ODBC)
        </option>
        <option :key="`${t.value}-${t.name}`" v-for="t in authTypes" :value="t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    <div v-show="windowsAuthEnabled" class="alert alert-info">
      <i class="material-icons-outlined">info</i>
      <div>
        Integrated authentication uses the current OS login &mdash; no username or
        password. On Linux and macOS it also requires unixODBC, the Microsoft ODBC
        Driver 18 for SQL Server, and a valid Kerberos ticket (kinit).
        <a href="https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/">Setup guide</a>
      </div>
    </div>
    <common-server-inputs
      v-show="!azureAuthEnabled"
      :config="config"
      :hide-credentials="windowsAuthEnabled"
      :hide-ssl="windowsAuthEnabled"
    >
      <div v-show="!windowsAuthEnabled" class="advanced-connection-settings">
        <h4 class="advanced-heading">
          SQL Server Options
        </h4>
        <div class="advanced-body">
          <div class="form-group">
            <label for="domain">
              Domain
              <i
                class="material-icons"
                v-tooltip="'Set \'domain\' to be logged in using Windows Integrated Authentication (NTLM)'"
              >help_outlined</i>
            </label>
            <input
              type="text"
              v-model="config.domain"
              class="form-control"
              :disabled="disabled"
            >
          </div>
          <div class="form-group">
            <label
              for="trustServerCertificate"
              class="checkbox-group"
            >
              <input
                type="checkbox"
                name="trustServerCertificate"
                v-model="config.trustServerCertificate"
                id="trustServerCertificate"
                :disabled="disabled"
              >
              Trust Server Certificate?
              <i
                class="material-icons"
                v-tooltip="'Use this for local dev servers and self-signed certificates. ssl -> rejectUnauthorized overrides this setting if ssl is enabled'"
              >help_outlined</i>
            </label>
          </div>
        </div>
      </div>
      <div v-show="windowsAuthEnabled" class="advanced-connection-settings">
        <h4 class="advanced-heading">
          ODBC Options
        </h4>
        <div class="advanced-body">
          <div class="form-group">
            <label for="encryptionMode">
              Encryption
              <i
                class="material-icons"
                v-tooltip="'How the ODBC driver encrypts the connection. Off: no encryption. On: encrypt and trust the server certificate (no validation). Strict: TDS 8.0, validate the certificate (optionally pinned below); requires SQL Server 2022+.'"
              >help_outlined</i>
            </label>
            <select
              id="encryptionMode"
              class="form-control"
              v-model="config.sqlServerOptions.encryptionMode"
            >
              <option value="off">Off (no encryption)</option>
              <option value="on">On (trust server certificate)</option>
              <option value="strict">Strict (validate certificate)</option>
            </select>
          </div>
          <div
            class="form-group"
            v-if="config.sqlServerOptions.encryptionMode === 'strict'"
          >
            <label>
              Server Certificate <span class="optional-text">(optional)</span>
              <i
                class="material-icons"
                v-tooltip="'Pin the server\'s exact certificate (PEM/DER/CER). Required in Strict mode when the certificate is self-signed or issued by a CA the OS does not trust.'"
              >help_outlined</i>
            </label>
            <file-picker v-model="config.sqlServerOptions.serverCertificate" />
          </div>
          <div class="form-group">
            <label for="serverSpn">
              Service Principal Name (SPN) <span class="optional-text">(optional)</span>
              <i
                class="material-icons"
                v-tooltip="'Override the Kerberos SPN when the auto-detected MSSQLSvc for the host and port is wrong (e.g. a CNAME, load balancer, or non-standard port). Leave blank to derive it automatically.'"
              >help_outlined</i>
            </label>
            <input
              id="serverSpn"
              type="text"
              v-model="config.sqlServerOptions.serverSpn"
              class="form-control"
              placeholder="MSSQLSvc/db.example.com:1433"
            >
          </div>
        </div>
      </div>
    </common-server-inputs>
    <common-entra-id v-show="azureAuthEnabled" :auth-type="authType" :config="config" :disabled="disabled" />
    <!-- Kerberos requires the real FQDN/SPN; an SSH tunnel routes through localhost and
         breaks SPN matching, so the tunnel is not offered for integrated auth. -->
    <common-advanced v-show="!azureAuthEnabled && !windowsAuthEnabled" :config="config" />
  </div>
</template>

<script>
  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'
  import FilePicker from '@/components/common/form/FilePicker.vue'
  import { AzureAuthTypes, AzureAuthType } from '@/lib/db/types';
  import { AppEvent } from '@/common/AppEvent'
  import _ from 'lodash'
  import { mapState, mapGetters } from 'vuex'
  import CommonEntraId from "@/components/connection/CommonEntraId.vue";

  export default {
    components: {CommonEntraId, CommonServerInputs, CommonAdvanced, FilePicker },
    props: {
      config: Object,
      disabled: {
        type: Boolean,
        default: false
      }
    },
    mounted() {
      if (this.config?.windowsAuthEnabled) {
        this.authType = 'windows'
        this.windowsAuthEnabled = true
        this.ensureSqlServerOptions()
      } else {
        this.authType = this.config?.azureAuthOptions?.azureAuthType || 'default'
        this.azureAuthEnabled = this.config?.azureAuthOptions?.azureAuthEnabled || false
      }
    },
    data() {
      return {
        azureAuthEnabled: false,
        windowsAuthEnabled: false,
        authType: 'default',
        authTypes: AzureAuthTypes,
      }
    },
    watch: {
      async authType() {
        if (this.authType === 'default') {
          this.azureAuthEnabled = false
          this.windowsAuthEnabled = false
          this.config.windowsAuthEnabled = false
          this.config.azureAuthOptions.azureAuthType = undefined
          return
        }

        // Integrated (Windows/Kerberos) and Azure auth are both paid features.
        if (this.$store.getters.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, "Enterprise Authentication");
          this.authType = 'default'
          return
        }

        if (this.authType === 'windows') {
          this.azureAuthEnabled = false
          this.windowsAuthEnabled = true
          this.config.windowsAuthEnabled = true
          this.config.azureAuthOptions.azureAuthType = undefined
          this.ensureSqlServerOptions()
        } else {
          this.azureAuthEnabled = true
          this.windowsAuthEnabled = false
          this.config.windowsAuthEnabled = false
          this.config.azureAuthOptions.azureAuthType = this.authType
        }
      },
      azureAuthEnabled() {
        this.config.azureAuthOptions.azureAuthEnabled = this.azureAuthEnabled
      },
      config() {
        if (this.config.windowsAuthEnabled) {
          this.authType = 'windows'
          this.windowsAuthEnabled = true
          this.azureAuthEnabled = false
          this.ensureSqlServerOptions()
        } else if (this.config.azureAuthOptions?.azureAuthEnabled) {
          this.authType = this.config.azureAuthOptions.azureAuthType
          this.windowsAuthEnabled = false
          this.azureAuthEnabled = true
        } else {
          this.authType = 'default'
          this.windowsAuthEnabled = false
          this.azureAuthEnabled = false
        }
      },
    },
    methods: {
      // Assign a fresh object with the keys pre-declared so Vue 2 tracks them reactively
      // (the model default is an empty {}, whose later-added keys wouldn't be reactive),
      // defaulting encryption to 'on' for a new integrated-auth connection.
      ensureSqlServerOptions() {
        this.config.sqlServerOptions = {
          encryptionMode: 'on',
          serverCertificate: undefined,
          serverSpn: undefined,
          ...(this.config.sqlServerOptions || {}),
        }
      },
    },
    computed: {
      ...mapState(['connection']),
      showPassword() {
        return this.authType === AzureAuthType.Password;
      }
    }
  }
</script>
